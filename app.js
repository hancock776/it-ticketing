const STORAGE_KEY = "it-ticketing-board";
const DEFAULT_STATUS = "Backlog";

const state = {
  tickets: loadTickets(),
  query: "",
  draggingTicketId: null,
};

const ticketForm = document.getElementById("ticketForm");
const ticketDialog = document.getElementById("ticketDialog");
const openDialogButton = document.getElementById("openDialogButton");
const closeDialogButton = document.getElementById("closeDialogButton");
const cancelDialogButton = document.getElementById("cancelDialogButton");
const searchInput = document.getElementById("searchInput");
const columns = [...document.querySelectorAll(".column")];
const ticketTemplate = document.getElementById("ticketTemplate");

openDialogButton.addEventListener("click", () => {
  ticketDialog.showModal();
  document.getElementById("title").focus();
});

closeDialogButton.addEventListener("click", closeDialog);
cancelDialogButton.addEventListener("click", closeDialog);

ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(ticketForm);
  const ticket = {
    id: crypto.randomUUID(),
    title: data.get("title").toString().trim(),
    description: data.get("description").toString().trim(),
    priority: data.get("priority").toString(),
    reporter: data.get("reporter").toString().trim(),
    status: DEFAULT_STATUS,
    createdAt: new Date().toISOString(),
  };

  if (!ticket.title || !ticket.description || !ticket.reporter) return;

  state.tickets.unshift(ticket);
  persistTickets();
  renderBoard();
  ticketForm.reset();
  ticketDialog.close();
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
  ticketDialog.close();
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
    if (beforeIndex !== -1) {
      return beforeIndex;
    }
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

    if (y < beforeBoundary) {
      return card.dataset.id;
    }
  }

  return null;
}

function renderBoard() {
  columns.forEach((column) => {
    const status = column.dataset.status;
    const list = column.querySelector(".ticket-list");
    list.innerHTML = "";

    const filtered = state.tickets.filter((ticket) => {
      const matchesStatus = ticket.status === status;
      const searchableText = `${ticket.title} ${ticket.description} ${ticket.reporter}`.toLowerCase();
      const matchesQuery = !state.query || searchableText.includes(state.query);
      return matchesStatus && matchesQuery;
    });

    filtered.forEach((ticket) => {
      const fragment = ticketTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".ticket");

      card.dataset.id = ticket.id;
      card.querySelector(".ticket-title").textContent = ticket.title;
      card.querySelector(".ticket-description").textContent = ticket.description;
      card.querySelector(".priority").textContent = ticket.priority;
      card.querySelector(".ticket-meta").textContent = `${ticket.reporter} · ${formatDate(ticket.createdAt)}`;

      const deleteButton = card.querySelector(".delete");
      deleteButton.addEventListener("click", () => {
        state.tickets = state.tickets.filter((entry) => entry.id !== ticket.id);
        persistTickets();
        renderBoard();
      });

      card.addEventListener("dragstart", (event) => {
        state.draggingTicketId = ticket.id;
        card.classList.add("dragging");
        event.dataTransfer?.setData("text/ticket-id", ticket.id);
      });

      card.addEventListener("dragend", () => {
        state.draggingTicketId = null;
        card.classList.remove("dragging");
        columns.forEach((col) => col.classList.remove("drop-target"));
      });

      list.appendChild(fragment);
    });
  });
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function persistTickets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tickets));
}

function loadTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

renderBoard();
