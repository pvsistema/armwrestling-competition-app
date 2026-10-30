using System.Reflection;
using System.Security.Cryptography;
using Microsoft.Web.WebView2.Core;

namespace Rukoborec;

/// <summary>Интерфейс программы, зашитый внутрь Rukoborec.exe, с проверкой целостности файлов.</summary>
internal static class WebContent
{
    private const string Prefix = "web/";
    private static readonly Assembly Asm = typeof(WebContent).Assembly;
    private static readonly Dictionary<string, string> Names = Asm.GetManifestResourceNames()
        .Where(n => n.Replace('\\', '/').StartsWith(Prefix))
        .ToDictionary(n => n.Replace('\\', '/')[Prefix.Length..], n => n, StringComparer.Ordinal);
    private static readonly Dictionary<string, byte[]> Cache = new(StringComparer.Ordinal);

    public static bool Has(string path) => Names.ContainsKey(path);

    /// <summary>Сверяет все файлы интерфейса с отпечатками, записанными при сборке.</summary>
    public static bool Verify(out string problem)
    {
        problem = "";
        if (WebHashes.Files.Count == 0 || Names.Count == 0)
        {
            problem = "нет файлов интерфейса";
            return false;
        }
        if (Names.Count != WebHashes.Files.Count)
        {
            problem = "состав файлов изменён";
            return false;
        }
        foreach (var (path, hash) in WebHashes.Files)
        {
            var data = Read(path);
            if (data is null || Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant() != hash)
            {
                problem = path;
                return false;
            }
        }
        return true;
    }

    public static byte[]? Read(string path)
    {
        lock (Cache)
        {
            if (Cache.TryGetValue(path, out var c)) return c;
            if (!Names.TryGetValue(path, out var name)) return null;
            using var s = Asm.GetManifestResourceStream(name);
            if (s is null) return null;
            using var ms = new MemoryStream();
            s.CopyTo(ms);
            var data = ms.ToArray();
            if (!WebHashes.Files.TryGetValue(path, out var hash) || Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant() != hash)
                return null;
            Cache[path] = data;
            return data;
        }
    }

    public static void Serve(CoreWebView2 core)
    {
        core.AddWebResourceRequestedFilter($"https://{Program.Host}/*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += (_, e) =>
        {
            if (!Uri.TryCreate(e.Request.Uri, UriKind.Absolute, out var u) || u.Host != Program.Host) return;
            var path = Uri.UnescapeDataString(u.AbsolutePath.TrimStart('/'));
            if (path == "") path = "index.html";
            var data = Read(path);
            if (data is null && !Path.HasExtension(path)) data = Read(path = "index.html");
            var env = core.Environment;
            e.Response = data is null
                ? env.CreateWebResourceResponse(null, 404, "Not Found", "")
                : env.CreateWebResourceResponse(new MemoryStream(data), 200, "OK",
                    $"Content-Type: {Mime(path)}\r\nCache-Control: no-cache");
        };
    }

    private static string Mime(string p) => Path.GetExtension(p).ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8",
        ".js" or ".mjs" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".json" => "application/json; charset=utf-8",
        ".svg" => "image/svg+xml",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".webp" => "image/webp",
        ".gif" => "image/gif",
        ".ico" => "image/x-icon",
        ".woff" => "font/woff",
        ".woff2" => "font/woff2",
        ".ttf" => "font/ttf",
        ".mp3" => "audio/mpeg",
        ".wav" => "audio/wav",
        ".pdf" => "application/pdf",
        ".txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    };
}
