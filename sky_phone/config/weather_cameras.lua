Config.WeatherCameras = {
    Enabled = true,
    RequestsPerMinute = 10,
    SessionSeconds = 30,
    UseStreamingFocus = true,
    Cameras = {
        {
            Id = "legion_square",
            Region = "los_santos",
            Coords = { x = -236.72, y = -1001.42, z = 45.20 },
            Rotation = { x = -16.0, y = 0.0, z = -28.0 },
            FieldOfView = 52.0,
        },
        {
            Id = "sandy_shores",
            Region = "blaine_county",
            Coords = { x = 1712.64, y = 3654.86, z = 47.25 },
            Rotation = { x = -13.0, y = 0.0, z = 142.0 },
            FieldOfView = 55.0,
        },
        {
            Id = "cayo_airstrip",
            Region = "cayo_perico",
            Coords = { x = 4437.38, y = -4471.62, z = 24.42 },
            Rotation = { x = -10.0, y = 0.0, z = 45.0 },
            FieldOfView = 58.0,
        },
    },
}

-- Remote cameras never move the player or alter spectator/entity state. Streaming focus is
-- local and is cleared when the camera closes. Disable it if an anti-cheat policy forbids it.
