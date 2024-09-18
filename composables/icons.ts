const fileTypeIconAssociations = {
    "file-excel": ["xls", "xlsx", "xlsm", "csv"],
    "file-word": ["doc", "docx", "dot", "dotx", "odt", "rtf"],
    "file-powerpoint": ["ppt", "pptx", "pptm", "pps", "ppsx"],
    "file-lines": ["txt", "log", "md", "json", "xml", "csv", "yaml"],
    "file-pdf": ["pdf"],
    "file-zipper": ["zip", "rar", "7z", "tar", "gz", "bz2", "iso"],
    "file-image": ["jpg", "jpeg", "png", "gif", "bmp", "svg", "tiff", "webp"],
    "file-audio": ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"],
    "file-video": ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "mpeg"]
};

export function findIconForFileType(type: string) {
    for (const key in fileTypeIconAssociations) {
        // @ts-ignore the key HAS to be present, we after all
        // just got it from the loop through the exact thing
        const items = fileTypeIconAssociations[key];
        if (!items.includes(type)) continue;
        return key;
    }
    return "file";
}
