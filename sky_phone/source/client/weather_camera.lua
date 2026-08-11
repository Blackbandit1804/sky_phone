local active_camera = nil
local focus_active = false
local camera_session = 0
local transition_ms = 350

local function stop_weather_camera(resume_phone)
    camera_session = camera_session + 1
    if active_camera and DoesCamExist(active_camera) then
        RenderScriptCams(false, true, transition_ms, true, false)
        DestroyCam(active_camera, false)
    end
    active_camera = nil
    if focus_active then ClearFocus() end
    focus_active = false
    if resume_phone then
        SetNuiFocus(true, true)
        SendNUIMessage({ type = "app:resume" })
    end
end

local function valid_vector(value)
    return type(value) == "table"
        and type(value.x) == "number" and value.x == value.x
        and type(value.y) == "number" and value.y == value.y
        and type(value.z) == "number" and value.z == value.z
end

local function start_weather_camera(camera)
    if type(camera) ~= "table" or not valid_vector(camera.coords) or not valid_vector(camera.rotation) then
        return false
    end
    local fov = tonumber(camera.fieldOfView)
    local duration = tonumber(camera.sessionSeconds)
    if not fov or fov < 20.0 or fov > 90.0 or not duration then return false end

    camera_session = camera_session + 1
    local session = camera_session
    SetNuiFocus(false, false)
    SendNUIMessage({ type = "app:suspend" })
    active_camera = CreateCamWithParams(
        "DEFAULT_SCRIPTED_CAMERA",
        camera.coords.x, camera.coords.y, camera.coords.z,
        camera.rotation.x, camera.rotation.y, camera.rotation.z,
        fov, true, 2
    )
    if not active_camera or not DoesCamExist(active_camera) then
        stop_weather_camera(true)
        return false
    end
    if camera.useStreamingFocus == true then
        SetFocusPosAndVel(camera.coords.x, camera.coords.y, camera.coords.z, 0.0, 0.0, 0.0)
        focus_active = true
    end
    SetCamActive(active_camera, true)
    RenderScriptCams(true, true, transition_ms, true, false)

    CreateThread(function()
        local expires_at = GetGameTimer() + math.floor(duration * 1000)
        while active_camera and session == camera_session do
            Wait(0)
            DisableAllControlActions(0)
            EnableControlAction(0, 177, true)
            BeginTextCommandDisplayHelp("STRING")
            AddTextComponentSubstringPlayerName(locale.WeatherCameraExit or "Weather camera | BACKSPACE to return")
            EndTextCommandDisplayHelp(0, false, true, -1)
            if IsControlJustReleased(0, 177) or IsEntityDead(PlayerPedId()) or GetGameTimer() >= expires_at then
                stop_weather_camera(true)
                break
            end
        end
    end)
    return true
end

RegisterNUICallback("weather:cameras", function(_, cb)
    local response = Bridge.Callbacks.Trigger("sky_phone:weather:cameras", {})
    cb(response or { success = false, error = "request_failed" })
end)

RegisterNUICallback("weather:camera-open", function(data, cb)
    if active_camera then cb({ success = false, error = "camera_active" }) return end
    local id = type(data) == "table" and data.id or nil
    if type(id) ~= "string" or not id:match("^[a-z0-9_]+$") then
        cb({ success = false, error = "camera_not_found" })
        return
    end
    local ped = PlayerPedId()
    if IsEntityDead(ped) or IsPedInAnyVehicle(ped, false) or GetEntitySpeed(ped) > 1.0 then
        cb({ success = false, error = "camera_requires_safe_position" })
        return
    end
    local response = Bridge.Callbacks.Trigger("sky_phone:weather:camera-open", { id = id })
    if not response or response.success ~= true or not start_weather_camera(response.data) then
        cb(response or { success = false, error = "request_failed" })
        return
    end
    cb({ success = true })
end)

AddEventHandler("sky_phone:nuiClosed", function() stop_weather_camera(false) end)
AddEventHandler("onResourceStop", function(resource)
    if resource == GetCurrentResourceName() then stop_weather_camera(false) end
end)
