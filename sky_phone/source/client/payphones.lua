local payphone_open = false
local nearest_payphone = nil
local active_booth = nil
local active_call_id = nil
local active_call_state = nil
local active_call_number = nil
local active_call_elapsed_seconds = 0
local active_call_elapsed_updated_at = 0
local call_channel = 0
local replacement_prop = nil
local hidden_prop = nil
local animation_scene = nil
local visuals_starting = false
local hangup_requested = false

local configured_models = {}
for _, model_name in ipairs(Config.Payphones.Props or {}) do
    configured_models[joaat(model_name)] = model_name
end

local function get_locale()
    return Locales[Config.Bridge.Locale] or Locales["en"]
end

local function load_model(model_hash)
    if HasModelLoaded(model_hash) then
        return true
    end
    RequestModel(model_hash)
    local deadline = GetGameTimer() + Config.Payphones.ModelLoadTimeoutMs
    while not HasModelLoaded(model_hash) and GetGameTimer() < deadline do
        Wait(0)
    end
    return HasModelLoaded(model_hash)
end

local function load_animation(dictionary)
    if HasAnimDictLoaded(dictionary) then
        return true
    end
    RequestAnimDict(dictionary)
    local deadline = GetGameTimer() + Config.Payphones.ModelLoadTimeoutMs
    while not HasAnimDictLoaded(dictionary) and GetGameTimer() < deadline do
        Wait(0)
    end
    return HasAnimDictLoaded(dictionary)
end

local function leave_call_voice()
    if call_channel == 0 then
        return
    end
    if Config.Calls.VoiceProvider == "pma" and GetResourceState("pma-voice") == "started" then
        exports["pma-voice"]:setCallChannel(0)
    end
    call_channel = 0
end

local function join_call_voice(channel)
    if Config.Calls.VoiceProvider ~= "pma" or GetResourceState("pma-voice") ~= "started" then
        Bridge.Debug("error", "[sky_phone] The payphone call could not join the configured voice provider.")
        return false
    end
    call_channel = tonumber(channel) or 0
    exports["pma-voice"]:setCallChannel(call_channel)
    return call_channel > 0
end

local function stop_call_visuals()
    local animation = Config.Payphones.Animation
    local ped = PlayerPedId()
    local visuals_active = animation_scene ~= nil or replacement_prop ~= nil
    visuals_starting = false

    if visuals_active and DoesEntityExist(ped) then
        StopAnimTask(ped, animation.Dictionary, animation.PedClip, 0.0)
        ClearPedTasksImmediately(ped)
    end

    if animation_scene then
        SetSynchronizedSceneHoldLastFrame(animation_scene, false)
        DisposeSynchronizedScene(animation_scene)
        animation_scene = nil
    end

    if replacement_prop and DoesEntityExist(replacement_prop) then
        StopEntityAnim(replacement_prop, animation.PropClip, animation.Dictionary, 0.0)
        SetEntityVisible(replacement_prop, false, false)
        SetEntityAsMissionEntity(replacement_prop, true, true)
        DeleteEntity(replacement_prop)
    end
    replacement_prop = nil

    if hidden_prop and DoesEntityExist(hidden_prop) then
        SetEntityVisible(hidden_prop, true, false)
    end
    hidden_prop = nil
    RemoveAnimDict(animation.Dictionary)
end

local function start_call_visuals()
    if visuals_starting or replacement_prop or not active_call_id
        or not active_booth or not DoesEntityExist(active_booth.entity)
    then
        return
    end

    visuals_starting = true
    local expected_call_id = active_call_id
    local booth = active_booth
    local replacement_hash = joaat(Config.Payphones.ReplacementProp)
    local animation = Config.Payphones.Animation
    if not load_model(replacement_hash) or not load_animation(animation.Dictionary) then
        Bridge.Debug("error", "[sky_phone] The payphone animation assets could not be loaded.")
        visuals_starting = false
        SetModelAsNoLongerNeeded(replacement_hash)
        RemoveAnimDict(animation.Dictionary)
        return
    end
    if active_call_id ~= expected_call_id or active_booth ~= booth or not DoesEntityExist(booth.entity) then
        visuals_starting = false
        SetModelAsNoLongerNeeded(replacement_hash)
        RemoveAnimDict(animation.Dictionary)
        return
    end

    local original = booth.entity
    local coords = GetEntityCoords(original)
    local rotation = GetEntityRotation(original, 2)
    local replacement = CreateObjectNoOffset(
        replacement_hash,
        coords.x,
        coords.y,
        coords.z,
        false,
        true,
        false
    )
    if replacement == 0 or not DoesEntityExist(replacement) then
        Bridge.Debug("error", "[sky_phone] The animated payphone replacement prop could not be created.")
        visuals_starting = false
        SetModelAsNoLongerNeeded(replacement_hash)
        RemoveAnimDict(animation.Dictionary)
        return
    end

    SetEntityRotation(replacement, rotation.x, rotation.y, rotation.z, 2, false)
    FreezeEntityPosition(replacement, true)
    SetEntityCollision(replacement, false, false)
    SetEntityVisible(original, false, false)
    hidden_prop = original
    replacement_prop = replacement

    local ped = PlayerPedId()
    animation_scene = CreateSynchronizedScene(
        coords.x,
        coords.y,
        coords.z,
        rotation.x,
        rotation.y,
        rotation.z,
        2
    )
    if not animation_scene or animation_scene == -1 then
        Bridge.Debug("error", "[sky_phone] The payphone synchronized scene could not be created.")
        animation_scene = nil
        stop_call_visuals()
        return
    end
    SetSynchronizedSceneHoldLastFrame(animation_scene, true)
    TaskSynchronizedScene(
        ped,
        animation_scene,
        animation.Dictionary,
        animation.PedClip,
        8.0,
        -8.0,
        2,
        0,
        1.0,
        0
    )
    PlayEntityAnim(replacement, animation.PropClip, animation.Dictionary, 8.0, false, true, false, 0.0, 0)
    visuals_starting = false
    SetModelAsNoLongerNeeded(replacement_hash)
end

local function booth_payload(booth)
    local coords = booth.coords
    return {
        model = booth.model,
        coords = { x = coords.x, y = coords.y, z = coords.z },
    }
end

local function close_payphone()
    local was_open = payphone_open
    payphone_open = false
    if was_open then
        SetNuiFocus(false, false)
        SendNUIMessage({ type = "payphone:close" })
    end
    if not active_call_id then
        active_booth = nil
    end
end

local function format_duration(seconds)
    local duration = math.max(0, math.floor(tonumber(seconds) or 0))
    return ("%02d:%02d"):format(math.floor(duration / 60), duration % 60)
end

local function replace_placeholder(value, placeholder, replacement)
    return value:gsub("{" .. placeholder .. "}", tostring(replacement))
end

local function current_call_elapsed_seconds()
    if active_call_state ~= "connected" then
        return 0
    end
    return active_call_elapsed_seconds
        + math.max(0, math.floor((GetGameTimer() - active_call_elapsed_updated_at) / 1000))
end

local function call_help_message()
    local locale = get_locale().Payphone
    local message
    if active_call_state == "connected" then
        local elapsed_seconds = current_call_elapsed_seconds()
        message = locale.ConnectedHelp
        message = replace_placeholder(message, "duration", format_duration(elapsed_seconds))
        message = replace_placeholder(message, "currency", Config.Payphones.Currency)
        message = replace_placeholder(message, "cost", elapsed_seconds * (tonumber(Config.Payphones.PricePerSecond) or 0))
    else
        message = locale.RingingHelp
    end
    return replace_placeholder(message, "number", active_call_number or "")
end

local function apply_active_call_state(data)
    if active_call_id ~= data.id then
        hangup_requested = false
    end
    active_call_id = data.id
    active_call_state = data.state
    active_call_number = data.otherNumber or active_call_number
    if data.state == "connected" then
        active_call_elapsed_seconds = math.max(0, math.floor(tonumber(data.elapsedSeconds) or 0))
        active_call_elapsed_updated_at = GetGameTimer()
    else
        active_call_elapsed_seconds = 0
        active_call_elapsed_updated_at = 0
    end
end

local function clear_active_call_state()
    active_call_id = nil
    active_call_state = nil
    active_call_number = nil
    active_call_elapsed_seconds = 0
    active_call_elapsed_updated_at = 0
    hangup_requested = false
end

local function open_payphone(booth)
    if payphone_open or active_call_id or IsNuiFocused() then
        return
    end
    active_booth = booth
    payphone_open = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        type = "payphone:open",
        data = {
            currency = Config.Payphones.Currency,
            maxNumberLength = Config.Sim.NumberLength,
            pricePerSecond = Config.Payphones.PricePerSecond,
            locales = get_locale().Nui.Payphone,
        },
    })
end

RegisterNUICallback("payphone:dial", function(data, cb)
    if not payphone_open or not active_booth or active_call_id then
        cb({ success = false, error = "invalid_request" })
        return
    end
    local payload = booth_payload(active_booth)
    payload.phoneNumber = type(data) == "table" and data.phoneNumber or nil
    local result = Bridge.Callbacks.Trigger("sky_phone:payphone:dial", payload)
    local call_started = result and result.success and result.data
        and (result.data.state == "ringing" or result.data.state == "connected")
    if call_started then
        apply_active_call_state(result.data)
    end
    cb(result or { success = false, error = "request_failed" })
    if call_started then
        close_payphone()
        start_call_visuals()
    end
end)

RegisterNUICallback("payphone:hangup", function(_, cb)
    if not active_call_id then
        cb({ success = false, error = "call_not_found" })
        return
    end
    local result = Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
    cb(result or { success = false, error = "request_failed" })
end)

RegisterNUICallback("payphone:close", function(_, cb)
    if active_call_id then
        Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
    end
    close_payphone()
    cb({ success = true })
end)

RegisterNetEvent("sky_phone:payphone:state", function(data)
    if type(data) ~= "table" then
        return
    end
    if data.state == "ringing" or data.state == "connected" then
        apply_active_call_state(data)
        close_payphone()
        start_call_visuals()
        if data.state == "connected" and data.channel and call_channel ~= tonumber(data.channel)
            and not join_call_voice(data.channel)
        then
            hangup_requested = true
            Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
        end
    else
        clear_active_call_state()
        leave_call_voice()
        stop_call_visuals()
        active_booth = nil
    end
    SendNUIMessage({ type = "payphone:state", data = data })
end)

CreateThread(function()
    while true do
        if not Config.Payphones.Enabled or payphone_open or active_call_id then
            nearest_payphone = nil
            Wait(Config.Payphones.ScanIntervalMs)
        else
            local ped_coords = GetEntityCoords(PlayerPedId())
            local closest = nil
            local closest_distance = Config.Payphones.ScanDistance + 0.01
            for model_hash, model_name in pairs(configured_models) do
                local entity = GetClosestObjectOfType(
                    ped_coords.x,
                    ped_coords.y,
                    ped_coords.z,
                    Config.Payphones.ScanDistance,
                    model_hash,
                    false,
                    false,
                    false
                )
                if entity ~= 0 and DoesEntityExist(entity) then
                    local coords = GetEntityCoords(entity)
                    local distance = #(ped_coords - coords)
                    if distance < closest_distance then
                        closest_distance = distance
                        closest = { entity = entity, coords = coords, model = model_name, distance = distance }
                    end
                end
            end
            nearest_payphone = closest
            Wait(Config.Payphones.ScanIntervalMs)
        end
    end
end)

CreateThread(function()
    while true do
        if nearest_payphone and nearest_payphone.distance <= Config.Payphones.InteractionDistance and not IsNuiFocused() then
            Bridge.Framework.ShowHelpNotification(get_locale().Payphone.Interact, "E")
            if IsControlJustReleased(0, 38) then
                open_payphone(nearest_payphone)
            end
            Wait(0)
        else
            Wait(250)
        end
    end
end)

CreateThread(function()
    while true do
        if active_call_id and active_booth then
            Bridge.Framework.ShowHelpNotification(call_help_message(), "E")
            if IsControlJustReleased(0, 38) and not hangup_requested then
                hangup_requested = true
                Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
            end

            local distance = #(GetEntityCoords(PlayerPedId()) - active_booth.coords)
            if distance > Config.Payphones.MaximumCallDistance and not hangup_requested then
                hangup_requested = true
                Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
            end
            Wait(0)
        else
            Wait(250)
        end
    end
end)

AddEventHandler("onResourceStop", function(resource_name)
    if resource_name ~= GetCurrentResourceName() then
        return
    end
    if payphone_open then
        SetNuiFocus(false, false)
    end
    leave_call_voice()
    stop_call_visuals()
    clear_active_call_state()
end)
