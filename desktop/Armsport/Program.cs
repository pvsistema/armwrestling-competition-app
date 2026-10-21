using Microsoft.Web.WebView2.Core;

namespace Armsport;

internal static class Program
{
    public const string Host = "app.armsport";
    public static string StartUrl => $"https://{Host}/index.html";

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
                "Армспорт", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (r == DialogResult.Yes)
                Shell.Open("https://developer.microsoft.com/microsoft-edge/webview2/#download-section");
            return;
        }

        var web = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        if (!File.Exists(Path.Combine(web, "index.html")))
        {
            MessageBox.Show($"Не найдены файлы интерфейса:\n{web}\n\nПереустановите программу.",
                "Армспорт", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        Application.Run(new MainForm(web));
    }
}

internal static class Shell
{
    public static void Open(string target) =>
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(target) { UseShellExecute = true });
}
