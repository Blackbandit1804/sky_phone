SkyPhonePayphones = {}

local maximum_horizontal_coordinate = 10000.0
local maximum_vertical_coordinate = 2000.0

local function finite_number(value)
    if type(value) ~= "number" or value ~= value or value == math.huge or value == -math.huge then
        return nil
    end
    return value
end

local function normalize_coordinates(value, allow_vector)
    local value_type = type(value)
    if value_type ~= "table" and (not allow_vector or value_type ~= "vector3") then
        return nil
    end

    local x = finite_number(value.x)
    local y = finite_number(value.y)
    local z = finite_number(value.z)
    if not x or not y or not z
        or math.abs(x) > maximum_horizontal_coordinate
        or math.abs(y) > maximum_horizontal_coordinate
        or math.abs(z) > maximum_vertical_coordinate
    then
        return nil
    end

    return { x = x, y = y, z = z }
end

local function normalize_location(location, allowed_models)
    if type(location) ~= "table" or type(location.model) ~= "string" or not allowed_models[location.model] then
        return nil
    end

    local coords = normalize_coordinates(location.coords, false)
    if not coords then
        return nil
    end

    return {
        model = location.model,
        coords = coords,
    }
end

function SkyPhonePayphones.ValidateLocations(locations, allowed_models)
    if type(locations) ~= "table" or type(allowed_models) ~= "table" then
        return {}, 0
    end

    local validated = {}
    local rejected = 0
    for index, location in pairs(locations) do
        local valid_index = type(index) == "number" and index >= 1 and index % 1 == 0
        local normalized = valid_index and normalize_location(location, allowed_models) or nil
        if normalized then
            normalized.index = index
            validated[#validated + 1] = normalized
        else
            rejected = rejected + 1
        end
    end

    table.sort(validated, function(left, right)
        return left.index < right.index
    end)
    for index = 1, #validated do
        validated[index].index = nil
    end

    return validated, rejected
end

function SkyPhonePayphones.FindNearest(locations, player_coords, maximum_distance)
    if type(locations) ~= "table" then
        return nil
    end

    local coords = normalize_coordinates(player_coords, true)
    local distance = finite_number(maximum_distance)
    if not coords or not distance or distance <= 0 then
        return nil
    end

    local nearest = nil
    local nearest_distance_squared = distance * distance
    for index = 1, #locations do
        local location = locations[index]
        if type(location) == "table" and type(location.coords) == "table" then
            local dx = coords.x - location.coords.x
            local dy = coords.y - location.coords.y
            local dz = coords.z - location.coords.z
            local distance_squared = dx * dx + dy * dy + dz * dz
            if distance_squared <= nearest_distance_squared then
                nearest = location
                nearest_distance_squared = distance_squared
            end
        end
    end

    return nearest
end
