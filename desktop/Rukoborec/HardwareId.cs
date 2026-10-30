using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace Rukoborec;

/// <summary>Номер компьютера по оборудованию: не переносится копированием папки с данными.</summary>
internal static class HardwareId
{
    private static string? _value;

    public static string Value => _value ??= Compute();

    private static string Compute()
    {
        var parts = new[]
        {
            Reg(@"SOFTWARE\Microsoft\Cryptography", "MachineGuid"),
            Reg(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0", "ProcessorNameString"),
            Reg(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0", "Identifier"),
            Reg(@"HARDWARE\DESCRIPTION\System\BIOS", "SystemManufacturer"),
            Reg(@"HARDWARE\DESCRIPTION\System\BIOS", "SystemProductName"),
            Reg(@"HARDWARE\DESCRIPTION\System\BIOS", "BaseBoardManufacturer"),
            Reg(@"HARDWARE\DESCRIPTION\System\BIOS", "BaseBoardProduct"),
            SystemVolumeSerial(),
        };
        var raw = "armsport-hw-v1|" + string.Join("|", parts);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
    }

    private static string Reg(string path, string name)
    {
        try
        {
            using var k = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64).OpenSubKey(path);
            return k?.GetValue(name)?.ToString()?.Trim() ?? "";
        }
        catch
        {
            return "";
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool GetVolumeInformation(string root, StringBuilder? name, int nameSize, out uint serial,
        out uint maxLen, out uint flags, StringBuilder? fs, int fsSize);

    private static string SystemVolumeSerial()
    {
        try
        {
            var root = Path.GetPathRoot(Environment.SystemDirectory) ?? @"C:\";
            return GetVolumeInformation(root, null, 0, out var serial, out _, out _, null, 0) ? serial.ToString("X8") : "";
        }
        catch
        {
            return "";
        }
    }
}
