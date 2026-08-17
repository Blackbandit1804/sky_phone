local RESOURCE_NAME = GetCurrentResourceName()
local SNAPSHOT_COOLDOWN_MS = 2000
local SNAPSHOT_REJECTION_LOG_COOLDOWN_MS = 10000
local registered_apps = {}
local snapshot_requests = {}
local snapshot_rejection_logs = {}

local function get_calling_resource(export_name)
    local owner_resource = GetInvokingResource()
    if owner_resource then
        return owner_resource
    end

    Bridge.Debug("warn", "[%s] %s rejected: the export must be called by another resource.",
        RESOURCE_NAME,
        export_name
    )
    return nil, "invalid_owner"
end

local function add_high_application(app_name, data, locales)
    local owner_resource, owner_error = get_calling_resource("addApplication")
    if not owner_resource then
        return false, owner_error
    end

    local definition, definition_error = SkyPhoneCompatibility.BuildHighDefinition(
        owner_resource,
        app_name,
        data,
        locales
    )
    if not definition then
        Bridge.Debug("warn", "[%s] High Phone registration rejected for %s: %s.",
            RESOURCE_NAME,
            owner_resource,
            definition_error
        )
        return false, definition_error
    end

    local existing = registered_apps[app_name]
    if existing and existing.owner_resource ~= owner_resource then
        return false, "duplicate_app_id"
    end

    local revision = existing and existing.revision + 1 or 1
    registered_apps[app_name] = {
        definition = definition,
        owner_resource = owner_resource,
        revision = revision,
    }
    TriggerClientEvent(
        "sky_phone:compat:high:client:syncApplication",
        -1,
        owner_resource,
        definition,
        revision
    )
    return true
end

local function build_snapshot()
    local ids = {}
    for app_id in pairs(registered_apps) do
        ids[#ids + 1] = app_id
    end
    table.sort(ids)

    local snapshot = {}
    for index = 1, #ids do
        snapshot[index] = registered_apps[ids[index]]
    end
    return snapshot
end

RegisterNetEvent("sky_phone:compat:high:server:requestSnapshot", function()
    local player_source = source
    if player_source <= 0 then
        Bridge.Debug("warn", "[%s] Rejected High Phone snapshot request without a player source.",
            RESOURCE_NAME
        )
        return
    end

    local now = GetGameTimer()
    local last_request = snapshot_requests[player_source]
    local elapsed = last_request and now - last_request or SNAPSHOT_COOLDOWN_MS
    if elapsed >= 0 and elapsed < SNAPSHOT_COOLDOWN_MS then
        local last_log = snapshot_rejection_logs[player_source]
        local log_elapsed = last_log and now - last_log or SNAPSHOT_REJECTION_LOG_COOLDOWN_MS
        if log_elapsed < 0 or log_elapsed >= SNAPSHOT_REJECTION_LOG_COOLDOWN_MS then
            snapshot_rejection_logs[player_source] = now
            Bridge.Debug("warn", "[%s] Rate-limited High Phone snapshot request from player %s.",
                RESOURCE_NAME,
                player_source
            )
        end
        return
    end
    snapshot_requests[player_source] = now

    TriggerClientEvent(
        "sky_phone:compat:high:client:replaceSnapshot",
        player_source,
        build_snapshot()
    )
end)

AddEventHandler("playerDropped", function()
    snapshot_requests[source] = nil
    snapshot_rejection_logs[source] = nil
end)

AddEventHandler("onResourceStop", function(resource_name)
    if resource_name == RESOURCE_NAME then
        return
    end

    local removed_ids = {}
    for app_id, record in pairs(registered_apps) do
        if record.owner_resource == resource_name then
            removed_ids[#removed_ids + 1] = app_id
        end
    end
    for index = 1, #removed_ids do
        local app_id = removed_ids[index]
        registered_apps[app_id] = nil
        TriggerClientEvent(
            "sky_phone:compat:high:client:removeApplication",
            -1,
            resource_name,
            app_id
        )
    end
end)

exports("addApplication", add_high_application)
SkyPhoneCompatibility.RegisterExportAlias("high-phone", "addApplication", add_high_application)
