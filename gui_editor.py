import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import json
import base64
import requests
import os
from datetime import datetime


class GitHubArticleEditorGUI:
    """
    Tkinter GUI to create, edit, and delete articles with a structured format.
    """

    def __init__(self, root):
        self.root = root
        self.root.title("GitHub Article Editor for mohhilat/articels")
        self.root.geometry("1100x750")

        self.articles = []  # Store articles as a list
        self.current_slug = None  # To track the currently selected article

        # --- Top Frame: GitHub Configuration ---
        config_frame = ttk.LabelFrame(root, text="GitHub Configuration")
        config_frame.pack(padx=10, pady=10, fill="x")

        ttk.Label(config_frame, text="GitHub Repo:").grid(row=0, column=0, padx=5, pady=5, sticky="w")
        self.repo_var = tk.StringVar(value="mohhilat/articels")
        self.repo_entry = ttk.Entry(config_frame, textvariable=self.repo_var, width=30)
        self.repo_entry.grid(row=0, column=1, padx=5, pady=5, sticky="ew")

        ttk.Label(config_frame, text="File Path:").grid(row=0, column=2, padx=5, pady=5, sticky="w")
        self.path_var = tk.StringVar(value="articles.json")
        self.path_entry = ttk.Entry(config_frame, textvariable=self.path_var, width=20)
        self.path_entry.grid(row=0, column=3, padx=5, pady=5, sticky="ew")

        ttk.Label(config_frame, text="GitHub Token:").grid(row=1, column=0, padx=5, pady=5, sticky="w")
        self.token_var = tk.StringVar()
        self.token_entry = ttk.Entry(config_frame, textvariable=self.token_var, show="*", width=30)
        self.token_entry.grid(row=1, column=1, columnspan=3, padx=5, pady=5, sticky="ew")

        config_frame.columnconfigure(1, weight=1)

        # --- Main Content Frame ---
        content_frame = ttk.Frame(root)
        content_frame.pack(padx=10, pady=10, fill="both", expand=True)
        content_frame.columnconfigure(1, weight=1)
        content_frame.rowconfigure(0, weight=1)

        # --- Left Sidebar: Article List ---
        list_frame = ttk.LabelFrame(content_frame, text="Articles")
        list_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        list_frame.rowconfigure(0, weight=1)
        self.article_listbox = tk.Listbox(list_frame, font=("Arial", 10), width=30)
        self.article_listbox.pack(fill="both", expand=True, padx=5, pady=5)
        self.article_listbox.bind("<<ListboxSelect>>", self.on_article_select)

        # --- Right Side: Editor ---
        editor_frame = ttk.LabelFrame(content_frame, text="Article Details")
        editor_frame.grid(row=0, column=1, sticky="nsew")
        editor_frame.columnconfigure(1, weight=1)
        editor_frame.rowconfigure(7, weight=1)

        # Editor Fields
        ttk.Label(editor_frame, text="Title:").grid(row=0, column=0, sticky="w", padx=5, pady=5)
        self.title_var = tk.StringVar()
        self.title_entry = ttk.Entry(editor_frame, textvariable=self.title_var)
        self.title_entry.grid(row=0, column=1, sticky="ew", padx=5, pady=5)

        ttk.Label(editor_frame, text="Slug:").grid(row=1, column=0, sticky="w", padx=5, pady=5)
        self.slug_var = tk.StringVar()
        self.slug_entry = ttk.Entry(editor_frame, textvariable=self.slug_var)
        self.slug_entry.grid(row=1, column=1, sticky="ew", padx=5, pady=5)

        ttk.Label(editor_frame, text="Main Image Path:").grid(row=2, column=0, sticky="w", padx=5, pady=5)
        self.image_var = tk.StringVar()
        self.image_entry = ttk.Entry(editor_frame, textvariable=self.image_var)
        self.image_entry.grid(row=2, column=1, sticky="ew", padx=5, pady=5)

        ttk.Label(editor_frame, text="Content (Body):").grid(row=6, column=0, columnspan=2, sticky="w", padx=5, pady=5)
        self.content_editor = scrolledtext.ScrolledText(editor_frame, wrap=tk.WORD, height=15)
        self.content_editor.grid(row=7, column=0, columnspan=2, sticky="nsew", padx=5, pady=5)

        # --- Status Bar ---
        self.status_var = tk.StringVar(value="Ready.")
        status_label = ttk.Label(root, textvariable=self.status_var, relief="sunken", anchor="w")
        status_label.pack(side="bottom", fill="x", padx=10, pady=5)

        # --- Action Buttons ---
        button_frame = ttk.Frame(root)
        button_frame.pack(side="bottom", pady=10)

        ttk.Button(button_frame, text="New Article", command=self.new_article).pack(side="left", padx=5)
        ttk.Button(button_frame, text="Save Article Locally", command=self.save_article).pack(side="left", padx=5)
        ttk.Button(button_frame, text="Delete Article", command=self.delete_article).pack(side="left", padx=5)
        ttk.Button(button_frame, text="Upload All to GitHub", command=self.upload_to_github).pack(side="left", padx=10)

        self.load_local_file()

    def update_status(self, message, color="black"):
        self.status_var.set(message)
        self.root.update_idletasks()

    def refresh_article_list(self):
        self.article_listbox.delete(0, tk.END)
        for article in self.articles:
            self.article_listbox.insert(tk.END, article.get('title', 'Untitled'))
        if self.articles:
            self.article_listbox.selection_set(0)
            self.on_article_select(None)
        else:
            self.new_article()

    def on_article_select(self, event):
        selection = self.article_listbox.curselection()
        if not selection: return

        selected_index = selection[0]
        article = self.articles[selected_index]
        self.current_slug = article.get('slug')

        self.title_var.set(article.get('title', ''))
        self.slug_var.set(article.get('slug', ''))
        self.image_var.set(article.get('mainImage', ''))

        # Convert body block to simple text for editing
        body_text = ""
        if 'body' in article and isinstance(article['body'], list):
            body_text = "\n\n".join(
                "".join(child.get('text', '') for child in block.get('children', []))
                for block in article['body']
            )
        elif 'content' in article:  # For backward compatibility
            body_text = article['content']

        self.content_editor.delete('1.0', tk.END)
        self.content_editor.insert('1.0', body_text)

    def new_article(self):
        self.current_slug = None
        self.title_var.set("")
        self.slug_var.set("")
        self.image_var.set("images/default.jpg")
        self.content_editor.delete('1.0', tk.END)
        self.article_listbox.selection_clear(0, tk.END)
        self.title_entry.focus()
        self.update_status("Enter details for new article.", "blue")

    def _text_to_body_block(self, text):
        """Converts plain text into the structured body format."""
        paragraphs = text.strip().split('\n\n')
        body = []
        for p in paragraphs:
            body.append({
                "_type": "block", "style": "normal",
                "children": [{"_type": "span", "text": p}]
            })
        return body

    def save_article(self):
        title = self.title_var.get().strip()
        slug = self.slug_var.get().strip()

        if not title or not slug:
            messagebox.showerror("Input Error", "Title and Slug are required.")
            return

        article_data = {
            "slug": slug,
            "title": title,
            "publishedAt": datetime.utcnow().isoformat() + "Z",
            "mainImage": self.image_var.get().strip(),
            "body": self._text_to_body_block(self.content_editor.get('1.0', tk.END))
        }

        # Check if updating an existing article or creating a new one
        if self.current_slug:
            found_index = -1
            for i, art in enumerate(self.articles):
                if art.get('slug') == self.current_slug:
                    found_index = i
                    break
            if found_index != -1:
                self.articles[found_index] = article_data
            else:  # Slug changed, treat as new
                self.articles.append(article_data)
        else:  # New article
            self.articles.append(article_data)

        self.current_slug = slug
        self.save_to_local_file()
        self.refresh_article_list()

    def delete_article(self):
        if not self.current_slug:
            messagebox.showwarning("No Selection", "Please select an article to delete.")
            return

        if messagebox.askyesno("Confirm Delete", f"Delete '{self.title_var.get()}'?"):
            self.articles = [art for art in self.articles if art.get('slug') != self.current_slug]
            self.save_to_local_file()
            self.refresh_article_list()
            self.update_status("Article deleted.", "green")

    def load_local_file(self):
        file_path = self.path_var.get()
        if not os.path.exists(file_path):
            self.update_status(f"File '{file_path}' not found. Ready to create new.", "orange")
            self.articles = []
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                self.articles = json.load(f)
            self.refresh_article_list()
            self.update_status(f"Loaded {len(self.articles)} articles from '{file_path}'.", "green")
        except (json.JSONDecodeError, Exception) as e:
            self.update_status(f"Error loading file: {e}", "red")

    def save_to_local_file(self):
        file_path = self.path_var.get()
        try:
            # Sort articles by date, newest first before saving
            self.articles.sort(key=lambda x: x.get('publishedAt', ''), reverse=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(self.articles, f, indent=2, ensure_ascii=False)
            self.update_status(f"Saved to '{file_path}'.", "green")
        except Exception as e:
            self.update_status(f"Save Error: {e}", "red")

    def upload_to_github(self):
        repo = self.repo_var.get().strip()
        path = self.path_var.get().strip()
        token = self.token_var.get().strip()

        if not all([repo, path, token]):
            messagebox.showerror("Input Error", "Repo, Path, and Token are required.")
            return

        self.save_to_local_file()  # Ensure local file is up-to-date
        data_to_upload = json.dumps(self.articles, indent=2, ensure_ascii=False)

        self.update_status("Uploading...", "blue")
        url = f"https://api.github.com/repos/{repo}/contents/{path}"
        headers = {"Authorization": f"token {token}"}

        try:
            response = requests.get(url, headers=headers)
            current_sha = response.json().get('sha') if response.ok else None

            content_bytes = data_to_upload.encode('utf-8')
            base64_content = base64.b64encode(content_bytes).decode('utf-8')

            upload_data = {"message": "Update articles via Python GUI", "content": base64_content}
            if current_sha:
                upload_data["sha"] = current_sha

            upload_response = requests.put(url, headers=headers, data=json.dumps(upload_data))
            upload_response.raise_for_status()

            self.update_status("Upload successful!", "green")
            messagebox.showinfo("Success", f"Uploaded {len(self.articles)} articles to GitHub.")
        except requests.exceptions.RequestException as e:
            self.update_status(f"Upload failed: {e}", "red")
            messagebox.showerror("Upload Error", f"Failed to upload: {e}")


if __name__ == "__main__":
    root = tk.Tk()
    app = GitHubArticleEditorGUI(root)
    root.mainloop()