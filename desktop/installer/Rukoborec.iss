; Установщик программы «Рукоборец» для Inno Setup 6 (https://jrsoftware.org/isdl.php)
; Обычно запускается из desktop\build.bat. Вручную: откройте этот файл в Inno Setup
; и нажмите Build > Compile — сначала соберите программу (desktop\release\Rukoborec).

#ifndef AppVersion
  #define AppVersion Trim(FileRead(FileOpen(AddBackslash(SourcePath) + "..\version.txt")))
#endif
#define AppName "Рукоборец"
#define AppExe "Rukoborec.exe"
#define AppPublisher "Ипатов Сергей Геннадьевич"

[Setup]
; AppId не менять: по нему установщик находит прошлую версию и обновляет её
AppId={{C0192546-F0E1-4A8F-9C9B-AA67AA748D77}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppCopyright=© {#AppPublisher}
VersionInfoVersion={#AppVersion}
VersionInfoProductName={#AppName}
VersionInfoDescription=Установка программы {#AppName}
DefaultDirName={autopf}\Rukoborec
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
UninstallDisplayName={#AppName} {#AppVersion}
UninstallDisplayIcon={app}\{#AppExe}
SetupIconFile=..\Rukoborec\app.ico
OutputDir=..\release
OutputBaseFilename=Rukoborec-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "Создать значок на рабочем столе"; GroupDescription: "Значки:"

[Files]
Source: "..\release\Rukoborec\*"; DestDir: "{app}"; Excludes: "*.pdb"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\Удалить {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "Запустить {#AppName}"; Flags: nowait postinstall skipifsilent
; После тихой установки обновления из программы — сразу запустить новую версию
Filename: "{app}\{#AppExe}"; Flags: nowait; Check: WizardSilent

; Данные турниров и активация лежат в %LOCALAPPDATA%\Armsport (служебное имя, не менять) — при удалении и обновлении
; программы они сохраняются.
