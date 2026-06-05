## Chatty Export Reader

![image](images/help%20images/Screenshot.png)

A desktop application for browsing, searching, annotating, and publishing exported AI conversations.

## Why This Exists

Large ChatGPT exports can contain hundreds or thousands of conversations and are difficult to browse directly in raw JSON format. Chatty Export Reader provides a desktop interface for exploring, searching, annotating, curating, and publishing those archives.

## Installation

![image](images/help%20images/Releases.png)

Download The latest release from the sidebar in github and extract the files to a new folder.
Then run "Chatty Export Reader.exe"


## Development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```


Note: Windows may display an Unknown Publisher warning because this is a new independent application.

##Features

- Browse exported conversation threads
- Read conversations in a clean desktop interface
- Search within conversation archives
- Add notes / annotations
- Redact or focus conversation content
- Export conversation views
- Customizable background environments

## Usage

### Getting Started

![image](images/help%20images/Open%20Conversation.png)

 - Request your data export from ChatGPT.
 - Download and extract the archive.
 - Open Chatty Export Reader and select the conversations.json file from the extracted folder.

 The app will try to load `Conversation/conversations.json` from the project folder on startup if it exists.

 Note: ChatGPT exports can be large. Initial loading may take a moment for very large archives.

### Search

![image](images/help%20images/Search%20Conversation.png)

Search your archive for specific words, phrases, or concepts and instantly jump between matches using built-in navigation controls. Matches are highlighted directly in the conversation, making it easy to locate relevant passages even within large exports.

When reviewing content for publication, Edit Mode adds additional search-driven tools for Soft Redaction, Hard Redaction, and Focus Matches, allowing you to quickly identify, review, and manage sensitive content.

### Edit, Curate, and Prepare Conversations for Sharing

![image](images/help%20images/Edit%20Conversation.png)

Edit Mode provides a non-destructive workflow for reviewing and preparing conversation archives for publication. Add private notes, apply message-level actions, or select individual text spans for Focus, Soft Redaction, and Hard Redaction without modifying the original export data.

Actions can be applied at both the message level and the selected text level, allowing sensitive information to be reviewed and managed with precision while preserving the surrounding conversation context.


⚠️ Important: Edits are non-destructive.

Redactions, notes, and focus actions are stored separately from the original conversation export. Simply editing a conversation does not permanently remove content from the source data.
To create a safely shareable version, export a Published Archive containing only the processed content.

### Preview (Before Publishing)

![image](images/help%20images/Preview%20Edit%20Conversation.png)

Exit Edit Mode at any time to preview exactly how the conversation will appear in a published export. Focused messages, notes, and redactions are rendered as they will appear to readers, making it easy to verify changes before sharing.

### Select Threads

![image](images/help%20images/Publish%20Conversations.png)

Choose exactly which conversations should be included in a published archive. Conversations can be marked for publication directly within the thread view or from the thread navigation panel.

Note: Some early ChatGPT exports may not contain conversation titles. These conversations will appear as "Untitled" until renamed or annotated.

### Save, Reload, and Publish
![image](images/help%20images/File%20Menu.png)

All edits, notes, publication selections, and redaction settings can be saved separately from the original conversation export and reloaded later from the File Menu. This allows large curation projects to be completed incrementally without modifying the source archive.

When ready, publish a curated archive as either Markdown or HTML for sharing, documentation, or long-term preservation.

Export Options:

-Markdown Export

Portable and easy to edit
Ideal for documentation workflows
Compatible with GitHub, Obsidian, and other Markdown-based tools

-HTML Export

Preserves visual formatting and presentation
Recommended when using Soft Redaction or other formatting-dependent review features
Provides the closest representation of the archive as viewed within Chatty Export Reader

### Change Backgrounds

![image](images/help%20images/Background%20Menu.png)

Use the View menu to select from a small handfull built-in backgrounds and create a reading environment that matches your preference.

## Disclaimer

This application was lovingly vibe-coded. I take no personal responsibility for the koalaty of the source code.

or as my ai koalaborator would put it:

This project was developed using a heavily AI-assisted workflow and serves as an experiment in collaborative software development.

While the application has been tested on large real-world exports, contributors should expect the occasional rough edge, surprising implementation detail, or enthusiastic shortcut taken in pursuit of shipping a useful tool.

## License

- Licensed under the Apache License 2.0.