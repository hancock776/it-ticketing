const STORAGE_KEY = "it-ticketing-board";
const DEFAULT_STATUS = "Backlog";

const state = {
  tickets: loadTickets(),
  query: "",
  draggingTicketId: null,
  isDragging: false,
  editingTicketId: null,
  editingCommentsDraft: [],
  newTicketStatus: DEFAULT_STATUS,
};

const ticketForm = document.getElementById("ticketForm");
const ticketDialog = document.getElementById("ticketDialog");
const newTicketStatusLabel = document.getElementById("newTicketStatusLabel");
const addTicketButtons = [...document.querySelectorAll(".add-ticket")];
const closeDialogButton = document.getElementById("closeDialogButton");
const cancelDialogButton = document.getElementById("cancelDialogButton");
const editForm = document.getElementById("editTicketForm");
const editDialog = document.getElementById("editTicketDialog");
const closeEditDialogButton = document.getElementById("closeEditDialogButton");
const deleteInEditDialogButton = document.getElementById("deleteInEditDialogButton");
const newCommentInput = document.getElementById("newCommentInput");
const sendCommentButton = document.getElementById("sendCommentButton");
const editCommentsPreview = document.getElementById("editCommentsPreview");
const searchInput = document.getElementById("searchInput");
const columns = [...document.querySelectorAll(".column")];
const ticketTemplate = document.getElementById("ticketTemplate");

addTicketButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openCreateDialog(button.dataset.status || DEFAULT_STATUS);
  });
});

closeDialogButton.addEventListener("click", closeDialog);
cancelDialogButton.addEventListener("click", closeDialog);
closeEditDialogButton.addEventListener("click", closeEditDialog);

newCommentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCommentFromInput();
  }
});

sendCommentButton.addEventListener("click", addCommentFromInput);

editDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  autoSaveAndCloseEditDialog();
});

editDialog.addEventListener("click", (event) => {
  if (event.target === editDialog) {
    autoSaveAndCloseEditDialog();
  }
});

deleteInEditDialogButton.addEventListener("click", () => {
  if (!state.editingTicketId) return;

  state.tickets = state.tickets.filter((ticket) => ticket.id !== state.editingTicketId);
  persistTickets();
  renderBoard();
  closeEditDialog();
});

ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(ticketForm);
  const ticket = {
    id: crypto.randomUUID(),
    title: data.get("title").toString().trim(),
    description: data.get("description").toString().trim(),
    priority: data.get("priority").toString(),
    status: state.newTicketStatus,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  if (!ticket.title || !ticket.description) return;

  state.tickets.unshift(ticket);
  persistTickets();
  renderBoard();
  closeDialog();
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.editingTicketId) return;

  const hasSaved = saveEditedTicketFromForm();
  if (!hasSaved) return;

  persistTickets();
  renderBoard();

  state.editingTicketId = null;
  state.editingCommentsDraft = [];
  editForm.reset();
  editDialog.close();
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim().toLowerCase();
  renderBoard();
});

columns.forEach((column) => {
  const status = column.dataset.status;
  const list = column.querySelector(".ticket-list");

  list.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    column.classList.add("drop-target");
  });

  list.addEventListener("dragleave", (event) => {
    if (!column.contains(event.relatedTarget)) {
      column.classList.remove("drop-target");
    }
  });

  list.addEventListener("drop", (event) => {
    event.preventDefault();
    column.classList.remove("drop-target");

    const ticketId = state.draggingTicketId || event.dataTransfer?.getData("text/ticket-id");
    if (!ticketId) return;

    const beforeTicketId = getDropReferenceTicketId(list, event.clientY);
    moveTicket(ticketId, status, beforeTicketId);
  });
});

function closeDialog() {
  ticketForm.reset();
  state.newTicketStatus = DEFAULT_STATUS;
  newTicketStatusLabel.textContent = `(${DEFAULT_STATUS})`;
  ticketDialog.close();
}

function openCreateDialog(status) {
  state.newTicketStatus = status;
  newTicketStatusLabel.textContent = `(${status})`;
  ticketDialog.showModal();
  document.getElementById("title").focus();
}

function openEditDialog(ticket) {
  state.editingTicketId = ticket.id;
  state.editingCommentsDraft = [...(ticket.comments || [])];

  document.getElementById("editTitle").value = ticket.title;
  document.getElementById("editDescription").value = ticket.description;
  document.getElementById("editPriority").value = ticket.priority;
  document.getElementById("editStatus").value = ticket.status;
  newCommentInput.value = "";
  renderDialogCommentsPreview(state.editingCommentsDraft);

  editDialog.showModal();
  document.getElementById("editTitle").focus();
}

function closeEditDialog() {
  editForm.reset();
  newCommentInput.value = "";
  renderDialogCommentsPreview([]);
  state.editingCommentsDraft = [];
  state.editingTicketId = null;
  editDialog.close();
}

function autoSaveAndCloseEditDialog() {
  if (state.editingTicketId) {
    const hasSaved = saveEditedTicketFromForm();
    if (hasSaved) {
      persistTickets();
      renderBoard();
    }

    editForm.reset();
    newCommentInput.value = "";
    renderDialogCommentsPreview([]);
    state.editingCommentsDraft = [];
    state.editingTicketId = null;
  }

  editDialog.close();
}

function saveEditedTicketFromForm() {
  const data = new FormData(editForm);
  const title = data.get("editTitle").toString().trim();
  const description = data.get("editDescription").toString().trim();
  const priority = data.get("editPriority").toString();
  const status = data.get("editStatus").toString();

  if (!title || !description || !status) return false;

  const ticket = state.tickets.find((entry) => entry.id === state.editingTicketId);
  if (!ticket) return false;

  ticket.title = title;
  ticket.description = description;
  ticket.priority = priority;
  ticket.status = status;
  ticket.comments = [...state.editingCommentsDraft];

  return true;
}

function addCommentFromInput() {
  if (!state.editingTicketId) return;

  const newComment = newCommentInput.value.trim();
  if (!newComment) return;

  state.editingCommentsDraft.push(newComment);
  newCommentInput.value = "";
  renderDialogCommentsPreview(state.editingCommentsDraft);

  const ticket = state.tickets.find((entry) => entry.id === state.editingTicketId);
  if (ticket) {
    ticket.comments = [...state.editingCommentsDraft];
    persistTickets();
    renderBoard();
  }
}

function moveTicket(ticketId, newStatus, beforeTicketId) {
  const draggedTicket = state.tickets.find((ticket) => ticket.id === ticketId);
  if (!draggedTicket) return;

  draggedTicket.status = newStatus;

  const reordered = state.tickets.filter((ticket) => ticket.id !== ticketId);
  const insertAt = getInsertIndex(reordered, newStatus, beforeTicketId);
  reordered.splice(insertAt, 0, draggedTicket);

  state.tickets = reordered;
  persistTickets();
  renderBoard();
}

function getInsertIndex(tickets, status, beforeTicketId) {
  if (beforeTicketId) {
    const beforeIndex = tickets.findIndex((ticket) => ticket.id === beforeTicketId);
    if (beforeIndex !== -1) return beforeIndex;
  }

  let lastStatusIndex = -1;
  tickets.forEach((ticket, index) => {
    if (ticket.status === status) {
      lastStatusIndex = index;
    }
  });

  return lastStatusIndex + 1;
}

function getDropReferenceTicketId(list, y) {
  const cards = [...list.querySelectorAll(".ticket:not(.dragging)")];

  for (const card of cards) {
    const box = card.getBoundingClientRect();
    const beforeBoundary = box.top + Math.min(24, box.height * 0.35);
    if (y < beforeBoundary) return card.dataset.id;
  }

  return null;
}

function renderBoard() {
  columns.forEach((column) => {
    const status = column.dataset.status;
    const list = column.querySelector(".ticket-list");
    list.innerHTML = "";

    const filtered = state.tickets.filter((ticket) => {
      const commentText = (ticket.comments || []).join(" ");
      const searchableText = `${ticket.title} ${ticket.description} ${commentText}`.toLowerCase();
      return ticket.status === status && (!state.query || searchableText.includes(state.query));
    });

    filtered.forEach((ticket) => {
      const fragment = ticketTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".ticket");
      const priorityBadge = card.querySelector(".priority");
      card.dataset.id = ticket.id;
      card.querySelector(".ticket-title").textContent = ticket.title;
      card.querySelector(".ticket-description").textContent = ticket.description;
      priorityBadge.textContent = ticket.priority;
      priorityBadge.className = `priority priority-${ticket.priority.toLowerCase()}`;
      card.querySelector(".ticket-meta").textContent = formatCommentCount(ticket.comments);

      card.addEventListener("click", () => {
        if (state.isDragging) return;
        openEditDialog(ticket);
      });

      card.addEventListener("dragstart", (event) => {
        state.draggingTicketId = ticket.id;
        state.isDragging = true;
        card.classList.add("dragging");
        event.dataTransfer?.setData("text/ticket-id", ticket.id);
      });

      card.addEventListener("dragend", () => {
        state.draggingTicketId = null;
        card.classList.remove("dragging");
        columns.forEach((col) => col.classList.remove("drop-target"));
        setTimeout(() => {
          state.isDragging = false;
        }, 0);
      });

      list.appendChild(fragment);
    });
  });
}

function renderDialogCommentsPreview(comments = []) {
  editCommentsPreview.innerHTML = "";

  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "dialog-comments-empty";
    empty.textContent = "Noch keine Kommentare vorhanden.";
    editCommentsPreview.appendChild(empty);
    return;
  }

  comments.forEach((comment) => {
    const item = document.createElement("p");
    item.className = "comment-message";
    item.textContent = comment;
    editCommentsPreview.appendChild(item);
  });
}

function formatCommentCount(comments = []) {
  const count = comments.length;
  return count === 1 ? "💬 1 Kommentar" : `💬 ${count} Kommentare`;
}

function persistTickets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tickets));
}

function loadTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.map((ticket) => ({
      ...ticket,
      comments: Array.isArray(ticket.comments) ? ticket.comments : [],
    }));
  } catch {
    return [];
  }
}

newTicketStatusLabel.textContent = `(${DEFAULT_STATUS})`;
renderBoard();
