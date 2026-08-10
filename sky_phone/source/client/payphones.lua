local payphone_open = false
local nearest_payphone = nil
local active_booth = nil
local active_call_id = nil
local call_channel = 0
local replacement_prop = nil
local hidden_prop = nil
local animation_scene = nil
local distance_hangup_requested = false

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
    if animation_scene then
        ClearPedTasks(ped)
        DisposeSynchronizedScene(animation_scene)
        animation_scene = nil
    else
        StopAnimTask(ped, animation.Dictionary, animation.PedClip, 2.0)
    end

    if replacement_prop and DoesEntityExist(replacement_prop) then
        StopEntityAnim(replacement_prop, animation.PropClip, animation.Dictionary, -2.0)
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
    if replacement_prop or not active_booth or not DoesEntityExist(active_booth.entity) then
        return
    end

    local replacement_hash = joaat(Config.Payphones.ReplacementProp)
    local animation = Config.Payphones.Animation
    if not load_model(replacement_hash) or not load_animation(animation.Dictionary) then
        Bridge.Debug("error", "[sky_phone] The payphone animation assets could not be loaded.")
        SetModelAsNoLongerNeeded(replacement_hash)
        return
    end

    local original = active_booth.entity
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
        SetModelAsNoLongerNeeded(replacement_hash)
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
    payphone_open = false
    SetNuiFocus(false, false)
    SendNUIMessage({ type = "payphone:close" })
    if not active_call_id then
        active_booth = nil
    end
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
    if result and result.success and result.data and (result.data.state == "ringing" or result.data.state == "connected") then
        active_call_id = result.data.id
        distance_hangup_requested = false
        start_call_visuals()
    end
    cb(result or { success = false, error = "request_failed" })
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
        active_call_id = data.id
        distance_hangup_requested = false
        start_call_visuals()
        if data.state == "connected" and data.channel and call_channel ~= tonumber(data.channel)
            and not join_call_voice(data.channel)
        then
            Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
        end
    else
        active_call_id = nil
        distance_hangup_requested = false
        leave_call_voice()
        stop_call_visuals()
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
            BeginTextCommandDisplayHelp("STRING")
            AddTextComponentSubstringPlayerName(get_locale().Payphone.Interact)
            EndTextCommandDisplayHelp(0, false, true, -1)
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
        if active_call_id and active_booth and not distance_hangup_requested then
            local distance = #(GetEntityCoords(PlayerPedId()) - active_booth.coords)
            if distance > Config.Payphones.MaximumCallDistance then
                distance_hangup_requested = true
                Bridge.Callbacks.Trigger("sky_phone:payphone:hangup", { id = active_call_id })
            end
            Wait(500)
        else
            Wait(1000)
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
end)
