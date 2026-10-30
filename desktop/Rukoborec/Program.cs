using Microsoft.Web.WebView2.Core;

namespace Rukoborec;

internal static class Program
{
    public const string Host = "app.armsport";
    public static string StartUrl => $"https://{Host}/index.html";

    /// <summary>Закрытие ради установки обновления — без вопроса «Закрыть программу?».</summary>
    public static bool Quitting { get; set; }

    /// <summary>Номер версии из desktop/version.txt (вшивается при сборке).</summary>
    public static string Version { get; } = FormatVersion(typeof(Program).Assembly.GetName().Version);

    private static string FormatVersion(System.Version? v) =>
        v is null ? "1.0.0" : v.Revision > 0 ? v.ToString(4) : v.ToString(3);

    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        try
        {
            CoreWebView2Environment.GetAvailableBrowserVersionString();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            var r = MessageBox.Show(
                "Для работы программы нужен компонент Microsoft Edge WebView2 Runtime.\n\n" +
                "Открыть страницу загрузки?",
                "Рукоборец", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (r == DialogResult.Yes)
                Shell.Open("https://developer.microsoft.com/microsoft-edge/webview2/#download-section");
            return;
        }

        if (!WebContent.Verify(out var problem))
        {
            MessageBox.Show($"Файлы программы повреждены или изменены ({problem}).\n\nСкачайте и установите программу заново.",
                "Рукоборец", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        Application.Run(new MainForm(""));
    }
}

internal static class Shell
{
    public static void Open(string target) =>
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(target) { UseShellExecute = true });
}
