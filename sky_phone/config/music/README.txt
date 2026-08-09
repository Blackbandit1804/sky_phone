Place server-owned .mp3 and .ogg files in this directory.

Optional artwork can be stored here as .png, .jpg, .jpeg or .webp. Register
each track in ../music.lua using paths such as:

    File = "config/music/night-drive.ogg"
    Artwork = "config/music/night-drive.webp"

Use file names containing only letters, numbers, dots, underscores or hyphens.
Subdirectories are supported. Restart the sky_phone resource after changing
tracks or files; a frontend build is not required.
