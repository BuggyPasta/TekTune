# TekTune

A dead-simple, no-frills documentation application for Debian 12, running in Docker.

## Storage Structure

- All data is stored in `/data/tektune` (mounted from your host, e.g. `/home/alex/docker_backup/tektune`).
- Each article has its own folder, named after the article title (spaces become underscores).
- Inside each article folder:
  - The article text is stored as `<Article_Title>.txt`.
  - All images (uploaded or pasted) are stored in the same folder, using their original filename (for uploads) or `image001.png`, `image002.png`, etc. (for pasted images).
- Example:

```
/data/tektune/Title_Goes_Here/
    Title_Goes_Here.txt
    diagram.png
    image001.png
    screenshot.jpg
```

## Article Creation Workflow

- When you click "Add Article":
  - You are prompted for a title (large, centered input, no toolbar or editor).
  - Only after saving the title does the main editor and toolbar appear.
  - Images can only be uploaded or pasted after the article is saved and has a title.

## Article Editing & Renaming

- You can edit the article title and content at any time.
- If you rename the article, the folder and `.txt` file are renamed automatically. Images remain in the folder with their original names.

## Deployment

- All persistent data is stored in `/data/tektune` (see `docker-compose.yml`).
- No database, no user management, no settings file.

See the repository and code comments for further details. 