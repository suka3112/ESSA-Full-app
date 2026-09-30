# Teams app package

Sideload zip for a personal (1:1) Azure Bot. Replace `id` and `bots[0].botId` in `manifest.json` with your Azure App Registration / `MicrosoftAppId` before packaging.

The zip must be **flat**: `manifest.json`, `color.png`, and `outline.png` at the zip root (not inside a nested folder).

## PowerShell (from this folder)

```powershell
Compress-Archive -Path manifest.json, color.png, outline.png -DestinationPath approval-bot.zip -Force
```

Sideload `approval-bot.zip` in Teams (custom app upload must be allowed in the tenant). If the bot App ID changes (client tenant swap), update `id` / `botId` and rebuild the zip.
