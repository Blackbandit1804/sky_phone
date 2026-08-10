Bridge.Database.AfterMigration("sky_phone", function()
RegisterCommand(Config.NotificationTest.Command, function(source)
    if source == 0 then
        print(("[sky_phone] /%s must be used by an in-game admin."):format(Config.NotificationTest.Command))
        return
    end

    if not Bridge.Framework.HasAdminGroup(source, Config.NotificationTest.AdminGroups) then
        Bridge.Debug(
            "warn",
            "[sky_phone] Source %s attempted to use the notification test command without an admin group.",
            tostring(source)
        )
        return
    end

    local slots = Bridge.Inventory.GetSlotsWithItem(source, Config.Phone.Item)
    local slot = slots[1]
    if not slot then
        Bridge.Debug(
            "warn",
            "[sky_phone] Notification test failed because source %s has no phone item.",
            tostring(source)
        )
        TriggerClientEvent("sky_phone:device:error", source, "phone_slot_missing")
        return
    end

    local imei, device_error = SkyPhone.EnsureDevice(source, slot)
    if not imei then
        Bridge.Debug(
            "warn",
            "[sky_phone] Notification test could not resolve a device for source %s: %s.",
            tostring(source),
            tostring(device_error)
        )
        TriggerClientEvent("sky_phone:device:error", source, device_error or "request_failed")
        return
    end

    local device = SkyPhone.LoadDevice(imei)
    if not device then
        Bridge.Debug(
            "error",
            "[sky_phone] Notification test could not load device %s for source %s.",
            imei,
            tostring(source)
        )
        TriggerClientEvent("sky_phone:device:error", source, "request_failed")
        return
    end

    local settings = Bridge.Database.Query([[
        SELECT `payload`
        FROM `sky_phone_device_data`
        WHERE `device_imei` = ? AND `namespace` = 'settings'
        LIMIT 1
    ]], { imei })[1]

    TriggerClientEvent("sky_phone:notification:test", source, {
        appId = "messages",
        title = "Notification Test",
        text = "This is a test notification.",
        device = {
            imei = imei,
            name = device.device_name,
            settings = settings and settings.payload or nil,
        },
    })

    Bridge.Debug(
        "info",
        "[sky_phone] Sent a test notification to source %s on device %s.",
        tostring(source),
        imei
    )
end, false)
end)
