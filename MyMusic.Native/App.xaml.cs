namespace MyMusic.Native;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = new Window(new AppShell())
        {
            Title = "myMusic - Sight-Reading Exercises",
            Width = 1000,
            Height = 700,
            MinimumWidth = 800,
            MinimumHeight = 500,
        };

        return window;
    }
}
