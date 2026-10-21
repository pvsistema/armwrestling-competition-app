namespace Armsport;

/// <summary>Окно табло для зрителей: перетащите на проектор и нажмите F.</summary>
internal sealed class BoardForm : WebForm
{
    public BoardForm(string webRoot) : base(webRoot, Program.StartUrl + "?board=1", "Табло — Армспорт")
    {
        Size = new Size(1600, 900);
        MinimumSize = new Size(640, 360);
    }
}
