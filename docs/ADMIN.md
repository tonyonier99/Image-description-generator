# Admin System Documentation

## Accessing Admin

### Direct URL Access
The admin interface is always accessible via direct URL:
```
/admin/
```

### Optional Unlock for Public UI Link

By default, the admin link ("管理") is hidden from the public navigation. You can reveal it using:

#### Keyboard Shortcut
- Press `Alt + Shift + A` on the main page
- This saves a persistent flag and reveals the admin link
- The link stays visible until you clear browser data

#### URL Hash
- Add `#admin` to any page URL: `/?#admin`
- This temporarily reveals the admin link for that session

## LocalStorage Keys

The admin system uses these localStorage keys:

- `idg:admin-unlocked` - Admin link unlock flag ("1" = unlocked)
- `idg:category-configs-override` - Local category configuration overrides
- `idg:admin-snapshots` - Configuration snapshots for rollback
- `idg:fonts-config` - Font configuration
- `idg:text-defaults` - Text field defaults per category

## Admin Features

### Configuration Management

#### Validation
All configurations are validated before saving:
- Required fields: key, label, folder, ext, count
- Unique keys and labels
- Valid file extensions (png, svg, jpg, jpeg)
- Proper option field types
- Select fields must have options array

#### Snapshots
- Automatic snapshots before major changes
- Manual snapshot creation
- Restore to any previous snapshot
- Keeps last 10 snapshots
- Each snapshot includes timestamp and description

#### Import/Export
- **Export**: Download current configuration as JSON
- **Import**: Upload JSON with validation and diff preview
- **Diff Preview**: Shows added/removed/modified categories before import
- **Validation**: All imports are validated before acceptance

### Safety Features

#### Confirmation Dialogs
All destructive operations require confirmation:
- Deleting categories
- Clearing overrides
- Restoring snapshots
- Importing configurations

#### Automatic Snapshots
Snapshots are created automatically before:
- Deleting categories
- Clearing overrides
- Importing new configurations
- Saving major changes

### Field Presets

Pre-defined field sets for common use cases:

#### Menu Preset
- 區段標題 (text)
- 品項（多行）(textarea)
- 幣別 (select: $, NT$, ¥)
- 價格顏色 (color)

#### Room Preset
- 房型名稱 (text)
- 入住人數 (number)
- 設施 (textarea)
- 景觀類型 (select: 海景, 山景, 市景, 庭園景)

#### Classic Preset
- 主標題 (text)
- 副標題 (text)
- 強調色 (color)
- 邊框樣式 (select: 無邊框, 簡單邊框, 優雅邊框)

#### Card Preset
- 姓名 (text)
- 職稱 (text)
- 電話 (text)
- Email (text)
- Logo位置 (select: 左上角, 右上角, 置中)

## Recommended Workflows

### Making Configuration Changes

1. **Before major changes**: Create a manual snapshot
2. **Edit configurations**: Use the admin interface
3. **Validate**: Check for validation errors
4. **Test**: Verify changes work on the main interface
5. **Save**: Use confirmed save operation

### Backup and Recovery

1. **Regular backups**: Export configurations periodically
2. **Before major updates**: Create snapshots and exports
3. **Recovery**: Use snapshots for quick rollback or imports for full restore

### Development Workflow

1. **Local development**: Use overrides for testing
2. **Share configurations**: Export/import JSON files
3. **Staging**: Test with snapshots before going live
4. **Production**: Clear overrides to use default config

## Troubleshooting

### Admin Link Not Visible
- Try the keyboard shortcut: `Alt + Shift + A`
- Use direct URL: `/admin/`
- Add hash to URL: `/?#admin`

### Configuration Not Loading
- Check browser console for errors
- Verify JSON format if imported
- Clear localStorage and reload default config

### Lost Configuration
- Check snapshots in admin panel
- Look for exported backup files
- Clear overrides to restore defaults

### Validation Errors
Common issues and solutions:
- **Duplicate keys**: Ensure all category keys are unique
- **Missing fields**: Check all required fields are filled
- **Invalid extensions**: Use only png, svg, jpg, jpeg
- **Select without options**: Select fields need options array

### Browser Storage Issues
- **Quota exceeded**: Clear old snapshots or exports
- **Corrupt data**: Clear specific localStorage keys
- **Privacy mode**: Some features may not work in private browsing

## Recovery Procedures

### Complete Reset
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage items starting with `idg:`
4. Reload admin page
5. Default configuration will be restored

### Partial Recovery
1. Go to admin snapshots section
2. Choose appropriate snapshot
3. Click restore
4. Verify changes in main interface

### Manual Configuration
If all else fails:
1. Export default configuration
2. Edit JSON file manually
3. Import corrected configuration
4. Verify and save

## Security Notes

- All data is stored locally in browser
- No server-side persistence
- Clearing browser data removes all customizations
- Export configurations for backup
- Admin access is client-side only