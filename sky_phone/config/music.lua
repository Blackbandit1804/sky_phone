Config.Music = {
    -- Files are found recursively in config/music by their Id. For example,
    -- Id = "night-drive" finds night-drive.ogg/mp3 and optional artwork with
    -- the same name (.webp/.png/.jpg/.jpeg), even inside subdirectories.
    Tracks = {
        -- {
        --     Id = "night-drive",
        --     Title = "Night Drive",
        --     Artist = "Sky Records",
        -- },
    },

    MaximumPersonalSongs = 100,
    MaximumPlaylists = 50,
    MaximumPlaylistSongs = 250,
    PlaylistNameMaxLength = 80,
    ActionsPerMinute = 30,
    MetadataTimeoutMs = 4500,
}
