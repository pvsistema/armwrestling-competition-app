using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Armsport;

/// <summary>Окно с интерфейсом программы на WebView2.</summary>
internal class WebForm : Form
{
    protected readonly WebView2 View = new() { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(22, 34, 66) };
    protected readonly string WebRoot;
    private readonly string _url;
    private readonly FullScreen _fs;

    protected WebForm(string webRoot, string url, string title)
    {
        WebRoot = webRoot;
        _url = url;
        _fs = new FullScreen(this);
        Text = title;
        Icon = LoadIcon();
        BackColor = Color.FromArgb(22, 34, 66);
        StartPosition = FormStartPosition.CenterScreen;
        Controls.Add(View);
        Load += async (_, _) => await Init();
    }

    private static Icon? LoadIcon()
    {
        using var s = typeof(WebForm).Assembly.GetManifestResourceStream("Armsport.app.ico");
        return s is null ? null : new Icon(s);
    }

    private async Task Init()
    {
        try
        {
            var env = await WebEnv.Get();
            await View.EnsureCoreWebView2Async(env);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Не удалось запустить встроенный браузер WebView2:\n" + ex.Message,
                "Армспорт", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }

        var core = View.CoreWebView2;
        WebEnv.Setup(core, WebRoot);
        core.DocumentTitleChanged += (_, _) =>
        {
            if (!string.IsNullOrWhiteSpace(core.DocumentTitle) && !core.DocumentTitle.StartsWith(Program.Host))
                Text = core.DocumentTitle;
        };
        core.ContainsFullScreenElementChanged += (_, _) => _fs.Set(core.ContainsFullScreenElement);
        core.NewWindowRequested += OnNewWindow;
        Configure(core);
        core.Navigate(_url);
    }

    protected virtual void Configure(CoreWebView2 core) { }

    protected virtual void OnNewWindow(object? sender, CoreWebView2NewWindowRequestedEventArgs e) { }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == Keys.F11)
        {
            _fs.Set(!_fs.On);
            return true;
        }
        if (keyData == Keys.Escape && _fs.On && View.CoreWebView2?.ContainsFullScreenElement != true)
        {
            _fs.Set(false);
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }
}
