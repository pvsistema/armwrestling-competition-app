using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;

namespace Rukoborec;

/// <summary>
/// Обновление программы. Интерфейс сам узнаёт о новой версии у сервера и присылает команду
/// { type: "update", version, url, kind, sha256, size, sig }. Программа проверяет подпись сервера,
/// скачивает установщик (Хранилище poehali.dev или Яндекс Диск), сверяет SHA-256 и запускает его.
/// </summary>
internal static class Updater
{
    /// <summary>Открытый ключ сервера активации (тот же, что проверяет ключи).</summary>
    private const string ServerPub = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcZ1yAYZ/vDEXD0E+4MGrhNuap/f7KnckVvOq/KBzwfmDpT/aoPuU+6gMtOBi5+F7FoPijWj1wraMEVGa2a/DXw==";
    private const string YaApi = "https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(30) };
    private static bool _busy;

    private sealed record Req(string type, string version, string url, string kind, string sha256, long size, string sig);
    private sealed record YaHref(string href);

    public static void Attach(CoreWebView2 core, Form owner)
    {
        core.WebMessageReceived += async (_, e) =>
        {
            Req? r;
            try { r = JsonSerializer.Deserialize<Req>(e.WebMessageAsJson); }
            catch { return; }
            if (r?.type != "update") return;
            await Run(core, owner, r);
        };
    }

    private static void Post(CoreWebView2 core, string state, string text = "", int pct = 0) =>
        core.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "update-state", state, text, pct }));

    private static async Task Run(CoreWebView2 core, Form owner, Req r)
    {
        if (_busy) return;
        _busy = true;
        try
        {
            if (!Verify(r))
            {
                Post(core, "error", "Подпись обновления не прошла проверку — файл не будет установлен.");
                return;
            }
            var dir = Path.Combine(Path.GetTempPath(), "Rukoborec-update");
            Directory.CreateDirectory(dir);
            var file = Path.Combine(dir, $"Rukoborec-Setup-{r.version}.exe");
            var src = await DirectUrl(r);
            using (var res = await Http.GetAsync(src, HttpCompletionOption.ResponseHeadersRead))
            {
                res.EnsureSuccessStatusCode();
                await using var input = await res.Content.ReadAsStreamAsync();
                await using var fs = File.Create(file);
                var buf = new byte[81920];
                long done = 0;
                var last = -1;
                int n;
                while ((n = await input.ReadAsync(buf)) > 0)
                {
                    await fs.WriteAsync(buf.AsMemory(0, n));
                    done += n;
                    var pct = (int)(done * 100 / Math.Max(1, r.size));
                    if (pct != last && pct <= 100)
                    {
                        last = pct;
                        Post(core, "progress", "", pct);
                    }
                }
            }
            var info = new FileInfo(file);
            string hash;
            await using (var fs = File.OpenRead(file)) hash = Convert.ToHexString(await SHA256.HashDataAsync(fs)).ToLowerInvariant();
            if (info.Length != r.size || hash != r.sha256)
            {
                File.Delete(file);
                Post(core, "error", "Файл обновления скачался с ошибкой. Попробуйте ещё раз.");
                return;
            }
            Post(core, "ready");
            var ok = MessageBox.Show(owner,
                $"Обновление {r.version} скачано.\n\nПрограмма закроется и установит новую версию. Данные турниров сохранятся.\n\nУстановить сейчас?",
                "Рукоборец", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
            if (ok != DialogResult.Yes)
            {
                Post(core, "later");
                return;
            }
            Process.Start(new ProcessStartInfo(file, "/SILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS") { UseShellExecute = true });
            Program.Quitting = true;
            Application.Exit();
        }
        catch (Exception ex)
        {
            Post(core, "error", "Не удалось скачать обновление: " + ex.Message);
        }
        finally
        {
            _busy = false;
        }
    }

    /// <summary>Прямая ссылка на файл: для Яндекс Диска — через его открытый API.</summary>
    private static async Task<string> DirectUrl(Req r)
    {
        if (r.kind != "yadisk") return r.url;
        var json = await Http.GetStringAsync(YaApi + Uri.EscapeDataString(r.url));
        return JsonSerializer.Deserialize<YaHref>(json)?.href ?? throw new InvalidOperationException("Яндекс Диск не отдал ссылку на файл");
    }

    private static bool AllowedUrl(Req r)
    {
        if (!Uri.TryCreate(r.url, UriKind.Absolute, out var u) || u.Scheme != "https") return false;
        var h = u.Host.ToLowerInvariant();
        return r.kind switch
        {
            "cdn" => h == "cdn.poehali.dev",
            "yadisk" => h is "yadi.sk" or "disk.yandex.ru" or "disk.yandex.com" or "disk.360.yandex.ru" || h.EndsWith(".yadi.sk"),
            _ => false,
        };
    }

    private static bool Verify(Req r)
    {
        if (r.size <= 0 || r.sha256 is not { Length: 64 } || string.IsNullOrEmpty(r.sig) || string.IsNullOrEmpty(r.version)) return false;
        if (!AllowedUrl(r)) return false;
        try
        {
            using var ecdsa = ECDsa.Create();
            ecdsa.ImportSubjectPublicKeyInfo(Convert.FromBase64String(ServerPub), out _);
            var data = Encoding.UTF8.GetBytes($"rukoborec-update|{r.version}|{r.sha256}|{r.size}");
            return ecdsa.VerifyData(data, B64u(r.sig), HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        }
        catch
        {
            return false;
        }
    }

    private static byte[] B64u(string s)
    {
        var t = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(t + new string('=', (4 - t.Length % 4) % 4));
    }
}
