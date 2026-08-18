import { useEffect, useRef, useState } from "react";
import {
  Search,
  Upload,
  Home,
  Star,
  Clock3,
  Share2,
  Trash2,
  Settings,
  Folder,
  FileText,
  MoreHorizontal,
  HardDrive,
  Grid2X2,
  List,
  Plus,
  X,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  AlertCircle,
  Download,
  Trash,
  ArrowLeft,
  Pencil,
  RotateCcw,
} from "lucide-react";

const API_URL = "http://localhost:8000";

function App() {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [trashFiles, setTrashFiles] = useState([]);

  const [storage, setStorage] = useState({
    used_bytes: 0,
    total_bytes: 10 * 1024 * 1024 * 1024,
    percentage: 0,
  });

  const [currentFolder, setCurrentFolder] = useState(null);

  const [activePage, setActivePage] = useState("files");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingTrash, setLoadingTrash] = useState(false);

  const [error, setError] = useState("");

  const [openMenu, setOpenMenu] = useState(null);

  // =========================================================
  // LOAD FOLDERS
  // =========================================================

  const loadFolders = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/folders`
      );

      if (!response.ok) {
        throw new Error("Failed to load folders");
      }

      const data = await response.json();

      setFolders(data);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load folders."
      );
    }
  };

  // =========================================================
  // LOAD STORAGE
  // =========================================================

  const loadStorage = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/storage`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load storage"
        );
      }

      const data = await response.json();

      setStorage(data);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================================================
  // LOAD FILES
  // =========================================================

  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      setError("");

      const folderQuery =
        currentFolder !== null
          ? `?folder_id=${currentFolder}`
          : "";

      const response = await fetch(
        `${API_URL}/api/files/${folderQuery}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load files"
        );
      }

      const data = await response.json();

      setFiles(data);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to NEXORA API."
      );
    } finally {
      setLoadingFiles(false);
    }
  };

  // =========================================================
  // LOAD TRASH
  // =========================================================

  const loadTrash = async () => {
    try {
      setLoadingTrash(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/trash`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load Trash"
        );
      }

      const data = await response.json();

      setTrashFiles(data);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load Trash."
      );
    } finally {
      setLoadingTrash(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadFolders();
    loadStorage();
  }, []);

  useEffect(() => {
    if (activePage === "files") {
      loadFiles();
    }

    if (activePage === "trash") {
      loadTrash();
    }
  }, [
    currentFolder,
    activePage,
  ]);

  // =========================================================
  // OPEN FILE PICKER
  // =========================================================

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // =========================================================
  // SELECT FILE
  // =========================================================

  const handleFileSelect = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setUploadOpen(true);
    setUploadProgress(0);
    setError("");
  };

  // =========================================================
  // UPLOAD FILE
  // =========================================================

  const startUpload = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "uploaded_file",
        selectedFile
      );

      setUploadProgress(30);

      let uploadUrl =
        `${API_URL}/api/files/upload`;

      if (currentFolder !== null) {
        uploadUrl +=
          `?folder_id=${currentFolder}`;
      }

      const response =
        await fetch(
          uploadUrl,
          {
            method: "POST",
            body: formData,
          }
        );

      setUploadProgress(80);

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            "Upload failed"
        );
      }

      await response.json();

      setUploadProgress(100);

      await loadFiles();
      await loadStorage();

      setTimeout(() => {
        setUploadOpen(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setUploading(false);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      }, 700);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Something went wrong during upload."
      );

      setUploading(false);
      setUploadProgress(0);
    }
  };

  // =========================================================
  // CLOSE UPLOAD
  // =========================================================

  const closeUpload = () => {
    if (uploading) {
      return;
    }

    setUploadOpen(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setError("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  // =========================================================
  // DOWNLOAD FILE
  // =========================================================

  const downloadFile = async (
    file
  ) => {
    try {
      setOpenMenu(null);
      setError("");

      const response =
        await fetch(
          `${API_URL}/api/files/${file.id}/download`
        );

      if (!response.ok) {
        throw new Error(
          "Download failed"
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;
      link.download =
        file.filename;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to download file."
      );
    }
  };

  // =========================================================
  // MOVE FILE TO TRASH
  // =========================================================

  const deleteFile = async (
    file
  ) => {
    const confirmed =
      window.confirm(
        `Move "${file.filename}" to Trash?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setOpenMenu(null);
      setError("");

      const response =
        await fetch(
          `${API_URL}/api/files/${file.id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            "Delete failed"
        );
      }

      await loadFiles();
      await loadTrash();
      await loadStorage();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to move file to Trash."
      );
    }
  };

  // =========================================================
  // RESTORE FILE
  // =========================================================

  const restoreFile = async (
    file
  ) => {
    try {
      setOpenMenu(null);
      setError("");

      const response =
        await fetch(
          `${API_URL}/api/files/${file.id}/restore`,
          {
            method: "POST",
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            "Restore failed"
        );
      }

      await loadTrash();
      await loadStorage();

      if (
        activePage === "files"
      ) {
        await loadFiles();
      }
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to restore file."
      );
    }
  };

  // =========================================================
  // PERMANENT DELETE
  // =========================================================

  const permanentlyDeleteFile =
    async (file) => {
      const confirmed =
        window.confirm(
          `Permanently delete "${file.filename}"? This cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setOpenMenu(null);
        setError("");

        const response =
          await fetch(
            `${API_URL}/api/files/${file.id}/permanent`,
            {
              method: "DELETE",
            }
          );

        if (!response.ok) {
          const errorData =
            await response
              .json()
              .catch(
                () => null
              );

          throw new Error(
            errorData?.detail ||
              "Permanent delete failed"
          );
        }

        await loadTrash();
        await loadStorage();
      } catch (error) {
        console.error(error);

        setError(
          error.message ||
            "Unable to permanently delete file."
        );
      }
    };

  // =========================================================
  // CREATE FOLDER
  // =========================================================

  const createFolder = async () => {
    const name =
      window.prompt(
        "Enter folder name:"
      );

    if (!name?.trim()) {
      return;
    }

    try {
      setError("");

      const params =
        new URLSearchParams();

      params.append(
        "name",
        name.trim()
      );

      if (
        currentFolder !== null
      ) {
        params.append(
          "parent_id",
          currentFolder
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/folders?${params.toString()}`,
          {
            method: "POST",
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            "Failed to create folder"
        );
      }

      await loadFolders();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to create folder."
      );
    }
  };

  // =========================================================
  // RENAME FOLDER
  // =========================================================

  const renameFolder = async (
    folder
  ) => {
    setOpenMenu(null);

    const newName =
      window.prompt(
        "Enter new folder name:",
        folder.name
      );

    if (!newName?.trim()) {
      return;
    }

    if (
      newName.trim() ===
      folder.name
    ) {
      return;
    }

    try {
      setError("");

      const params =
        new URLSearchParams();

      params.append(
        "name",
        newName.trim()
      );

      const response =
        await fetch(
          `${API_URL}/api/folders/${folder.id}?${params.toString()}`,
          {
            method: "PATCH",
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            "Failed to rename folder"
        );
      }

      await loadFolders();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to rename folder."
      );
    }
  };

  // =========================================================
  // DELETE FOLDER
  // =========================================================

  const deleteFolder = async (
    folder
  ) => {
    setOpenMenu(null);

    const confirmed =
      window.confirm(
        `Delete folder "${folder.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response =
        await fetch(
          `${API_URL}/api/folders/${folder.id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            "Failed to delete folder"
        );
      }

      await loadFolders();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to delete folder."
      );
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredFiles =
    files.filter(
      (file) =>
        file.filename
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  const filteredTrash =
    trashFiles.filter(
      (file) =>
        file.filename
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  // =========================================================
  // CURRENT FOLDER
  // =========================================================

  const currentFolderData =
    folders.find(
      (folder) =>
        folder.id ===
        currentFolder
    );

  // =========================================================
  // NAVIGATION
  // =========================================================

  const openFolder = (
    folder
  ) => {
    setSearch("");
    setOpenMenu(null);
    setCurrentFolder(
      folder.id
    );
    setActivePage("files");
  };

  const goHome = () => {
    setSearch("");
    setOpenMenu(null);
    setCurrentFolder(null);
    setActivePage("files");
  };

  const openTrash = () => {
    setSearch("");
    setOpenMenu(null);
    setCurrentFolder(null);
    setActivePage("trash");
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#171717]">

      <div className="flex min-h-screen">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white px-5 py-6 md:flex md:flex-col">

          <div className="flex items-center gap-2 px-2">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
              N
            </div>

            <span className="text-lg font-semibold tracking-tight">
              NEXORA
            </span>

          </div>

          <nav className="mt-10 space-y-1">

            <NavItem
              icon={
                <Home size={18} />
              }
              label="My Files"
              active={
                activePage ===
                "files"
              }
              onClick={
                goHome
              }
            />

            <NavItem
              icon={
                <Star size={18} />
              }
              label="Starred"
            />

            <NavItem
              icon={
                <Share2 size={18} />
              }
              label="Shared"
            />

            <NavItem
              icon={
                <Clock3 size={18} />
              }
              label="Recent"
            />

            <NavItem
              icon={
                <Trash2 size={18} />
              }
              label="Trash"
              active={
                activePage ===
                "trash"
              }
              onClick={
                openTrash
              }
            />

          </nav>

          <div className="mt-auto">

            <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">

              <div className="mb-3 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <HardDrive
                    size={16}
                  />

                  <span className="text-sm font-medium">
                    Storage
                  </span>

                </div>

                <span className="text-xs text-neutral-500">
                  {storage.percentage}%
                </span>

              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">

                <div
                  className="h-full rounded-full bg-neutral-900 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      storage.percentage,
                      100
                    )}%`,
                  }}
                />

              </div>

              <p className="mt-2 text-xs text-neutral-500">

                {formatStorageSize(
                  storage.used_bytes
                )}{" "}
                of{" "}
                {formatStorageSize(
                  storage.total_bytes
                )}{" "}
                used

              </p>

            </div>

            <NavItem
              icon={
                <Settings size={18} />
              }
              label="Settings"
            />

          </div>

        </aside>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="flex h-20 items-center justify-between border-b border-neutral-200 bg-white px-5 md:px-8">

            <div className="relative w-full max-w-md">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                type="text"
                placeholder="Search files..."
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
              />

            </div>

            <div className="ml-4 flex items-center gap-3">

              {activePage ===
                "files" && (
                <>
                  <button
                    onClick={
                      openFilePicker
                    }
                    className="hidden rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-neutral-50 sm:flex sm:items-center sm:gap-2"
                  >

                    <Upload
                      size={16}
                    />

                    Upload

                  </button>

                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    className="hidden"
                    onChange={
                      handleFileSelect
                    }
                  />
                </>
              )}

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
                J
              </div>

            </div>

          </header>

          {/* =================================================
              CONTENT
          ================================================= */}

          <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">

            {/* =================================================
                FILES PAGE
            ================================================= */}

            {activePage ===
              "files" && (
              <>
                {/* PAGE HEADING */}

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                  <div>

                    <div className="flex items-center gap-2">

                      {currentFolder !==
                        null && (

                        <button
                          onClick={
                            goHome
                          }
                          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                        >
                          <ArrowLeft
                            size={17}
                          />
                        </button>

                      )}

                      <button
                        onClick={
                          goHome
                        }
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                      >
                        Home
                      </button>

                      {currentFolder !==
                        null && (
                        <>
                          <span className="text-neutral-300">
                            /
                          </span>

                          <span className="text-sm text-neutral-500">
                            {
                              currentFolderData?.name
                            }
                          </span>
                        </>
                      )}

                    </div>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">

                      {currentFolder ===
                      null
                        ? "My Files"
                        : currentFolderData?.name ||
                          "Folder"}

                    </h1>

                  </div>

                  <button
                    onClick={
                      createFolder
                    }
                    className="flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >

                    <Plus
                      size={17}
                    />

                    New Folder

                  </button>

                </div>

                {/* ERROR */}

                {error && (
                  <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                    <AlertCircle
                      size={17}
                    />

                    {error}

                  </div>
                )}

                {/* FOLDERS */}

                {currentFolder ===
                  null && (

                  <div className="mt-8">

                    <div className="mb-3 flex items-center justify-between">

                      <h2 className="text-sm font-semibold">
                        Folders
                      </h2>

                      <span className="text-xs text-neutral-500">

                        {
                          folders.filter(
                            (
                              folder
                            ) =>
                              folder.parent_id ===
                              null
                          ).length
                        }{" "}
                        folders

                      </span>

                    </div>

                    {folders.filter(
                      (
                        folder
                      ) =>
                        folder.parent_id ===
                        null
                    ).length ===
                    0 ? (

                      <div className="rounded-xl border border-neutral-200 bg-white px-5 py-10 text-center">

                        <Folder
                          size={30}
                          className="mx-auto text-neutral-300"
                        />

                        <p className="mt-3 text-sm font-medium">
                          No folders yet
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Create your first folder.
                        </p>

                      </div>

                    ) : (

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                        {folders
                          .filter(
                            (
                              folder
                            ) =>
                              folder.parent_id ===
                              null
                          )
                          .map(
                            (
                              folder
                            ) => (

                              <div
                                key={
                                  folder.id
                                }
                                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm"
                              >

                                <button
                                  onClick={() =>
                                    openFolder(
                                      folder
                                    )
                                  }
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >

                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">

                                    <Folder
                                      size={
                                        20
                                      }
                                      className="text-neutral-700"
                                    />

                                  </div>

                                  <div className="min-w-0">

                                    <p className="truncate text-sm font-medium">
                                      {
                                        folder.name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-xs text-neutral-500">
                                      Folder
                                    </p>

                                  </div>

                                </button>

                                <div className="relative ml-2">

                                  <button
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      setOpenMenu(
                                        openMenu ===
                                          `folder-${folder.id}`
                                          ? null
                                          : `folder-${folder.id}`
                                      );
                                    }}
                                    className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-700"
                                  >

                                    <MoreHorizontal
                                      size={
                                        18
                                      }
                                    />

                                  </button>

                                  {openMenu ===
                                    `folder-${folder.id}` && (
                                    <FolderMenu
                                      folder={
                                        folder
                                      }
                                      onRename={
                                        renameFolder
                                      }
                                      onDelete={
                                        deleteFolder
                                      }
                                    />
                                  )}

                                </div>

                              </div>

                            )
                          )}

                      </div>

                    )}

                  </div>

                )}

                {/* FILES */}

                <div className="mt-10">

                  <div className="mb-3 flex items-center justify-between">

                    <h2 className="text-sm font-semibold">
                      Files
                    </h2>

                    <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">

                      <button
                        onClick={() =>
                          setView(
                            "grid"
                          )
                        }
                        className={`rounded-md p-1.5 ${
                          view ===
                          "grid"
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-400"
                        }`}
                      >

                        <Grid2X2
                          size={
                            15
                          }
                        />

                      </button>

                      <button
                        onClick={() =>
                          setView(
                            "list"
                          )
                        }
                        className={`rounded-md p-1.5 ${
                          view ===
                          "list"
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-400"
                        }`}
                      >

                        <List
                          size={
                            15
                          }
                        />

                      </button>

                    </div>

                  </div>

                  {loadingFiles ? (

                    <LoadingBox />

                  ) : view ===
                    "list" ? (

                    <div className="overflow-visible rounded-xl border border-neutral-200 bg-white">

                      <div className="hidden grid-cols-[1fr_120px_160px_40px] border-b border-neutral-200 px-5 py-3 text-xs font-medium text-neutral-500 md:grid">

                        <span>
                          Name
                        </span>

                        <span>
                          Type
                        </span>

                        <span>
                          Modified
                        </span>

                        <span />

                      </div>

                      {filteredFiles.map(
                        (
                          file
                        ) => (

                          <div
                            key={
                              file.id
                            }
                            className="relative grid grid-cols-1 gap-3 border-b border-neutral-100 px-5 py-4 last:border-0 md:grid-cols-[1fr_120px_160px_40px] md:items-center md:gap-0"
                          >

                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">

                                <FileText
                                  size={
                                    18
                                  }
                                />

                              </div>

                              <div>

                                <p className="text-sm font-medium">
                                  {
                                    file.filename
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {formatFileSize(
                                    file.size
                                  )}
                                </p>

                              </div>

                            </div>

                            <span className="text-xs text-neutral-500">
                              {getFileType(
                                file.filename
                              )}
                            </span>

                            <span className="text-xs text-neutral-500">
                              {formatDate(
                                file.created_at
                              )}
                            </span>

                            <div className="relative hidden md:block">

                              <button
                                onClick={() =>
                                  setOpenMenu(
                                    openMenu ===
                                      file.id
                                      ? null
                                      : file.id
                                  )
                                }
                                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                              >

                                <MoreHorizontal
                                  size={
                                    18
                                  }
                                />

                              </button>

                              {openMenu ===
                                file.id && (
                                <FileMenu
                                  file={
                                    file
                                  }
                                  onDownload={
                                    downloadFile
                                  }
                                  onDelete={
                                    deleteFile
                                  }
                                />
                              )}

                            </div>

                          </div>

                        )
                      )}

                      {filteredFiles.length ===
                        0 && (
                        <EmptyFiles
                          currentFolder={
                            currentFolder
                          }
                        />
                      )}

                    </div>

                  ) : (

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                      {filteredFiles.map(
                        (
                          file
                        ) => (

                          <div
                            key={
                              file.id
                            }
                            className="relative rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm"
                          >

                            <div className="flex items-start justify-between">

                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">

                                <FileText
                                  size={
                                    20
                                  }
                                />

                              </div>

                              <div className="relative">

                                <button
                                  onClick={() =>
                                    setOpenMenu(
                                      openMenu ===
                                        file.id
                                        ? null
                                        : file.id
                                    )
                                  }
                                  className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                                >

                                  <MoreHorizontal
                                    size={
                                      18
                                    }
                                  />

                                </button>

                                {openMenu ===
                                  file.id && (
                                  <FileMenu
                                    file={
                                      file
                                    }
                                    onDownload={
                                      downloadFile
                                    }
                                    onDelete={
                                      deleteFile
                                    }
                                  />
                                )}

                              </div>

                            </div>

                            <p className="mt-5 truncate text-sm font-medium">
                              {
                                file.filename
                              }
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">

                              {formatFileSize(
                                file.size
                              )}{" "}
                              ·{" "}
                              {formatDate(
                                file.created_at
                              )}

                            </p>

                          </div>

                        )
                      )}

                      {filteredFiles.length ===
                        0 && (
                        <EmptyFiles
                          currentFolder={
                            currentFolder
                          }
                        />
                      )}

                    </div>

                  )}

                </div>
              </>
            )}

            {/* =================================================
                TRASH PAGE
            ================================================= */}

            {activePage ===
              "trash" && (

              <div>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                  <div>

                    <div className="flex items-center gap-2">

                      <button
                        onClick={
                          goHome
                        }
                        className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                      >
                        <ArrowLeft
                          size={
                            17
                          }
                        />
                      </button>

                      <button
                        onClick={
                          goHome
                        }
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                      >
                        Home
                      </button>

                      <span className="text-neutral-300">
                        /
                      </span>

                      <span className="text-sm text-neutral-500">
                        Trash
                      </span>

                    </div>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                      Trash
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                      Deleted files are kept here until permanently removed.
                    </p>

                  </div>

                </div>

                {error && (
                  <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                    <AlertCircle
                      size={
                        17
                      }
                    />

                    {error}

                  </div>
                )}

                <div className="mt-8">

                  {loadingTrash ? (

                    <LoadingBox />

                  ) : filteredTrash.length ===
                    0 ? (

                    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-16 text-center">

                      <Trash2
                        size={
                          34
                        }
                        className="mx-auto text-neutral-300"
                      />

                      <p className="mt-3 text-sm font-medium">
                        Trash is empty
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        Deleted files will appear here.
                      </p>

                    </div>

                  ) : (

                    <div className="overflow-visible rounded-xl border border-neutral-200 bg-white">

                      <div className="hidden grid-cols-[1fr_120px_160px_100px] border-b border-neutral-200 px-5 py-3 text-xs font-medium text-neutral-500 md:grid">

                        <span>
                          Name
                        </span>

                        <span>
                          Type
                        </span>

                        <span>
                          Deleted
                        </span>

                        <span>
                          Actions
                        </span>

                      </div>

                      {filteredTrash.map(
                        (
                          file
                        ) => (

                          <div
                            key={
                              file.id
                            }
                            className="grid grid-cols-1 gap-4 border-b border-neutral-100 px-5 py-4 last:border-0 md:grid-cols-[1fr_120px_160px_100px] md:items-center md:gap-0"
                          >

                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">

                                <Trash2
                                  size={
                                    18
                                  }
                                />

                              </div>

                              <div className="min-w-0">

                                <p className="truncate text-sm font-medium">
                                  {
                                    file.filename
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {formatFileSize(
                                    file.size
                                  )}
                                </p>

                              </div>

                            </div>

                            <span className="text-xs text-neutral-500">
                              {getFileType(
                                file.filename
                              )}
                            </span>

                            <span className="text-xs text-neutral-500">
                              {formatDate(
                                file.created_at
                              )}
                            </span>

                            <div className="flex items-center gap-1">

                              <button
                                onClick={() =>
                                  restoreFile(
                                    file
                                  )
                                }
                                title="Restore"
                                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                              >

                                <RotateCcw
                                  size={
                                    16
                                  }
                                />

                              </button>

                              <button
                                onClick={() =>
                                  permanentlyDeleteFile(
                                    file
                                  )
                                }
                                title="Delete permanently"
                                className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                              >

                                <Trash
                                  size={
                                    16
                                  }
                                />

                              </button>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              </div>

            )}

          </section>

        </main>

      </div>

      {/* =================================================
          UPLOAD MODAL
      ================================================= */}

      {uploadOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">

          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-semibold">
                  Upload file
                </h2>

                <p className="mt-1 text-sm text-neutral-500">

                  {currentFolder !==
                  null
                    ? `Upload to ${
                        currentFolderData?.name ||
                        "folder"
                      }`
                    : "Add a file to your NEXORA storage."}

                </p>

              </div>

              {!uploading && (

                <button
                  onClick={
                    closeUpload
                  }
                  className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >

                  <X
                    size={
                      18
                    }
                  />

                </button>

              )}

            </div>

            {selectedFile && (

              <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white">

                    {uploadProgress ===
                    100 ? (

                      <CheckCircle2
                        size={
                          21
                        }
                      />

                    ) : uploading ? (

                      <LoaderCircle
                        size={
                          21
                        }
                        className="animate-spin"
                      />

                    ) : (

                      <FileUp
                        size={
                          21
                        }
                      />

                    )}

                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-medium">
                      {
                        selectedFile.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {formatFileSize(
                        selectedFile.size
                      )}
                    </p>

                  </div>

                </div>

                {uploading && (

                  <div className="mt-5">

                    <div className="mb-2 flex justify-between text-xs text-neutral-500">

                      <span>
                        Uploading...
                      </span>

                      <span>
                        {
                          uploadProgress
                        }%
                      </span>

                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">

                      <div
                        className="h-full rounded-full bg-neutral-900 transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                        }}
                      />

                    </div>

                  </div>

                )}

                {!uploading &&
                  uploadProgress !==
                    100 && (

                    <button
                      onClick={
                        startUpload
                      }
                      className="mt-5 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                    >

                      Upload to NEXORA

                    </button>

                  )}

                {uploadProgress ===
                  100 && (

                  <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium">

                    <CheckCircle2
                      size={
                        17
                      }
                    />

                    Upload complete

                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
}


// =========================================================
// LOADING BOX
// =========================================================

function LoadingBox() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-16">

      <div className="flex items-center gap-2 text-sm text-neutral-500">

        <LoaderCircle
          size={
            18
          }
          className="animate-spin"
        />

        Loading...

      </div>

    </div>
  );
}


// =========================================================
// FOLDER MENU
// =========================================================

function FolderMenu({
  folder,
  onRename,
  onDelete,
}) {
  return (
    <div className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">

      <button
        onClick={() =>
          onRename(folder)
        }
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
      >

        <Pencil
          size={
            15
          }
        />

        Rename

      </button>

      <button
        onClick={() =>
          onDelete(folder)
        }
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >

        <Trash
          size={
            15
          }
        />

        Delete

      </button>

    </div>
  );
}


// =========================================================
// FILE MENU
// =========================================================

function FileMenu({
  file,
  onDownload,
  onDelete,
}) {
  return (
    <div className="absolute right-0 top-9 z-40 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">

      <button
        onClick={() =>
          onDownload(file)
        }
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
      >

        <Download
          size={
            15
          }
        />

        Download

      </button>

      <button
        onClick={() =>
          onDelete(file)
        }
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >

        <Trash
          size={
            15
          }
        />

        Move to Trash

      </button>

    </div>
  );
}


// =========================================================
// EMPTY FILES
// =========================================================

function EmptyFiles({
  currentFolder,
}) {
  return (
    <div className="px-5 py-12 text-center">

      <FileText
        size={
          30
        }
        className="mx-auto text-neutral-300"
      />

      <p className="mt-3 text-sm font-medium">
        No files here
      </p>

      <p className="mt-1 text-xs text-neutral-500">

        {currentFolder !==
        null
          ? "Upload a file to this folder."
          : "Upload your first file to NEXORA."}

      </p>

    </div>
  );
}


// =========================================================
// SIDEBAR ITEM
// =========================================================

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-neutral-100 text-neutral-900"
          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >

      {icon}

      {label}

    </button>
  );
}


// =========================================================
// FILE TYPE
// =========================================================

function getFileType(
  filename
) {
  const extension =
    filename
      .split(".")
      .pop()
      ?.toUpperCase();

  if (
    [
      "MP4",
      "MOV",
      "AVI",
      "MKV",
    ].includes(
      extension
    )
  ) {
    return "VIDEO";
  }

  if (
    [
      "JPG",
      "JPEG",
      "PNG",
      "GIF",
      "WEBP",
    ].includes(
      extension
    )
  ) {
    return "IMAGE";
  }

  if (
    [
      "ZIP",
      "RAR",
      "7Z",
      "TAR",
      "GZ",
    ].includes(
      extension
    )
  ) {
    return "ARCHIVE";
  }

  return (
    extension ||
    "FILE"
  );
}


// =========================================================
// FILE SIZE
// =========================================================

function formatFileSize(
  bytes
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      bytes /
      (1024 *
        1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 *
      1024 *
      1024)
  ).toFixed(1)} GB`;
}


// =========================================================
// STORAGE SIZE
// =========================================================

function formatStorageSize(
  bytes
) {
  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      bytes /
      (1024 *
        1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 *
      1024 *
      1024)
  ).toFixed(1)} GB`;
}


// =========================================================
// DATE
// =========================================================

function formatDate(
  dateString
) {
  const date =
    new Date(
      dateString
    );

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}


export default App;
