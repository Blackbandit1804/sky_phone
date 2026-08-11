local camera_config = Config.WeatherCameras or {}
local cameras_by_id = {}
local camera_summaries = {}

local function finite_number(value)
    return type(value) == "number" and value == value and value > -math.huge and value < math.huge
end

for _, camera in ipairs(camera_config.Cameras or {}) do
    local id = type(camera.Id) == "string" and camera.Id or ""
    local coords = camera.Coords or {}
    local rotation = camera.Rotation or {}
    if id:match("^[a-z0-9_]+$")
        and type(camera.Region) == "string"
        and finite_number(coords.x) and finite_number(coords.y) and finite_number(coords.z)
        and finite_number(rotation.x) and finite_number(rotation.y) and finite_number(rotation.z)
    then
        cameras_by_id[id] = camera
        camera_summaries[#camera_summaries + 1] = { id = id, region = camera.Region }
    else
        print(("[sky_phone] Ignoring invalid weather camera configuration: %s"):format(tostring(camera.Id)))
    end
end

local function authorize(source)
    local session = SkyPhone.RequireSession(source)
    if not session then return false, "not_authenticated" end
    if camera_config.Enabled == false then return false, "camera_disabled" end
    local limit = math.max(1, math.floor(tonumber(camera_config.RequestsPerMinute) or 10))
    if not SkyPhone.AllowOperation(source, "weather_camera", limit, 60) then
        return false, "rate_limited"
    end
    return true
end

Bridge.Callbacks.Register("sky_phone:weather:cameras", function(source)
    local allowed, error_code = authorize(source)
    if not allowed then return { success = false, error = error_code } end
    return { success = true, data = { cameras = camera_summaries } }
end)

Bridge.Callbacks.Register("sky_phone:weather:camera-open", function(source, data)
    local allowed, error_code = authorize(source)
    if not allowed then return { success = false, error = error_code } end
    local id = type(data) == "table" and data.id or nil
    local camera = type(id) == "string" and cameras_by_id[id] or nil
    if not camera then return { success = false, error = "camera_not_found" } end

    local fov = math.max(20.0, math.min(90.0, tonumber(camera.FieldOfView) or 50.0))
    local duration = math.max(10, math.min(120, math.floor(tonumber(camera_config.SessionSeconds) or 30)))
    return {
        success = true,
        data = {
            id = id,
            coords = camera.Coords,
            rotation = camera.Rotation,
            fieldOfView = fov,
            sessionSeconds = duration,
            useStreamingFocus = camera_config.UseStreamingFocus == true,
        },
    }
end)
