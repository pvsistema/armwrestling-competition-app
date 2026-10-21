using Microsoft.Web.WebView2.Core;

namespace Armsport;

/// <summary>Главное окно: секретарь, судьи, протоколы.</summary>
internal sealed class MainForm : WebForm
{
    private BoardForm? _board;

    public MainForm(string webRoot) : base(webRoot, Program.StartUrl, "Армспорт — турнир по армрестлингу")
    {
        MinimumSize = new Size(1024, 700);
        Size = new Size(1440, 900);
        WindowState = FormWindowState.Maximized;
        FormClosing += (_, e) =>
        {
            var r = MessageBox.Show(this, "Закрыть программу? Данные турнира сохранены на этом компьютере.",
                "Армспорт", MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button2);
            if (r != DialogResult.Yes) e.Cancel = true;
            else _board?.Close();
        };
    }

    protected override void Configure(CoreWebView2 core)
    {
        core.Settings.AreBrowserAcceleratorKeysEnabled = true;
    }

    /// <summary>window.open: табло — в своё окно, PDF для печати — во встроенное окно, ссылки — в браузер.</summary>
    protected override void OnNewWindow(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        var uri = e.Uri ?? "";
        if (uri.Contains("board=1"))
        {
            e.Handled = true;
            if (_board is null || _board.IsDisposed)
            {
                _board = new BoardForm(WebRoot);
                _board.Show();
                MoveToSecondScreen(_board);
            }
            else
            {
                if (_board.WindowState == FormWindowState.Minimized) _board.WindowState = FormWindowState.Normal;
                _board.Activate();
            }
            return;
        }
        if (uri.StartsWith("http", StringComparison.OrdinalIgnoreCase) && !uri.Contains(Program.Host))
        {
            e.Handled = true;
            Shell.Open(uri);
        }
    }

    private void MoveToSecondScreen(Form f)
    {
        var mine = Screen.FromControl(this);
        var other = Screen.AllScreens.FirstOrDefault(s => !s.Equals(mine));
        if (other is null) return;
        f.StartPosition = FormStartPosition.Manual;
        f.Bounds = other.WorkingArea;
        f.WindowState = FormWindowState.Maximized;
    }
}
