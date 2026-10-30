using Microsoft.Web.WebView2.Core;

namespace Rukoborec;

/// <summary>Общее окружение WebView2: одни данные турнира (localStorage) для всех окон.</summary>
internal static class WebEnv
{
    private static Task<CoreWebView2Environment>? _env;

    public static string DataDir { get; } =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Armsport", "WebView2");

    public static Task<CoreWebView2Environment> Get()
    {
        Directory.CreateDirectory(DataDir);
        return _env ??= CoreWebView2Environment.CreateAsync(null, DataDir,
            new CoreWebView2EnvironmentOptions { Language = "ru-RU" });
    }

    public static async Task Setup(CoreWebView2 core)
    {
        WebContent.Serve(core);
        await core.AddScriptToExecuteOnDocumentCreatedAsync(
            $"Object.defineProperty(window,'__armHw',{{value:'{HardwareId.Value}',writable:false,configurable:false}});");
        var s = core.Settings;
        s.AreDevToolsEnabled = false;
        s.IsZoomControlEnabled = true;
        s.IsStatusBarEnabled = false;
        s.AreDefaultContextMenusEnabled = true;
        s.IsGeneralAutofillEnabled = false;
        s.IsPasswordAutosaveEnabled = false;
        s.UserAgent += $" ArmsportDesktop/{Program.Version}";

        core.NavigationStarting += (_, e) =>
        {
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var u)) return;
            if (u.Scheme is "http" or "https" && u.Host != Program.Host)
            {
                e.Cancel = true;
                Shell.Open(e.Uri);
            }
        };
    }
}
