using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;

namespace Rukoborec;

/// <summary>
/// Обновление программы. Интерфейс сам узнаёт о новой версии у сервера и присылает команду
/// { type: "update", version, parts, sha256, size, sig }. Программа проверяет подпись сервера,
/// скачивает установщик по частям, сверяет SHA-256 и запускает его — новая версия ставится поверх.
/// </summary>
internal static class Updater
{
    /// <summary>Открытый ключ сервера активации (тот же, что проверяет ключи).</summary>
    private const string ServerPub = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcZ1yAYZ/vDEXD0E+4MGrhNuap/f7KnckVvOq/KBzwfmDpT/aoPuU+6gMtOBi5+F7FoPijWj1wraMEVGa2a/DXw==";
    private const string CdnPrefix = "https://cdn.poehali.dev/";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(5) };
    private static bool _busy;

    private sealed record Req(string type, string version, string[] parts, string sha256, long size, string sig);

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
            await using (var fs = File.Create(file))
            {
                for (var i = 0; i < r.parts.Length; i++)
                {
                    var bytes = await Http.GetByteArrayAsync(r.parts[i]);
                    await fs.WriteAsync(bytes);
                    Post(core, "progress", "", (int)((i + 1) * 100L / r.parts.Length));
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

    private static bool Verify(Req r)
    {
        if (r.parts is not { Length: > 0 } || r.size <= 0 || r.sha256 is not { Length: 64 } || string.IsNullOrEmpty(r.sig) || string.IsNullOrEmpty(r.version)) return false;
        if (r.parts.Any(p => !p.StartsWith(CdnPrefix, StringComparison.Ordinal))) return false;
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
