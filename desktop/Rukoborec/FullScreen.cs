namespace Rukoborec;

/// <summary>Полноэкранный режим окна (табло на проекторе, клавиша F).</summary>
internal sealed class FullScreen
{
    private readonly Form _f;
    private FormBorderStyle _border;
    private FormWindowState _state;
    private Rectangle _bounds;

    public FullScreen(Form f) => _f = f;

    public bool On { get; private set; }

    public void Set(bool on)
    {
        if (on == On) return;
        On = on;
        if (on)
        {
            _border = _f.FormBorderStyle;
            _state = _f.WindowState;
            _bounds = _f.Bounds;
            _f.FormBorderStyle = FormBorderStyle.None;
            _f.WindowState = FormWindowState.Normal;
            _f.Bounds = Screen.FromControl(_f).Bounds;
            _f.TopMost = true;
        }
        else
        {
            _f.TopMost = false;
            _f.FormBorderStyle = _border;
            _f.Bounds = _bounds;
            _f.WindowState = _state;
        }
    }
}
