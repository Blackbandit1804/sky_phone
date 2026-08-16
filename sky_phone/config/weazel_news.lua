Config.WeazelNews = {
    Enabled = true,
    PageSize = 20,
    MaximumOffset = 10000,
    MaximumImages = 6,
    SearchMaxLength = 80,
    DraftTitleMinLength = 1,
    DraftBodyMinLength = 1,
    TitleMinLength = 1,
    TitleMaxLength = 160,
    BodyMinLength = 1,
    BodyMaxLength = 12000,
    ExcerptMaxLength = 240,
    RateLimits = {
        Read = 120,
        Write = 20,
    },
    Categories = {
        "official",
        "events",
        "jobs",
        "news",
        "business",
    },
    -- Framework job name = minimum grade. Every listed job can manage every article.
    AllowedJobs = {
        weazel = 0,
        reporter = 0,
    },
}
