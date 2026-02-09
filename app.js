const STORAGE_KEY = "codexAppointments";

const form = document.getElementById("appointment-form");
const successMessage = document.getElementById("driver-success");
const appointmentsBody = document.getElementById("appointments-body");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const todayCount = document.getElementById("today-count");
const pendingCount = document.getElementById("pending-count");
const totalLoads = document.getElementById("total-loads");
const navButtons = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll("[data-panel]");
const trackingForm = document.getElementById("tracking-form");
const trackingResult = document.getElementById("tracking-result");
const trackingCodeDisplay = document.getElementById("tracking-code");

const statusLabels = {
  pending: "در انتظار تأیید",
  confirmed: "تأیید شده",
  completed: "انجام شده",
};

const readAppointments = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Invalid storage", error);
    return [];
  }
};

const saveAppointments = (appointments) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const isSameDay = (first, second) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const createTrackingCode = () => crypto.randomUUID().slice(0, 8).toUpperCase();

const updateSummary = (appointments) => {
  const today = new Date();
  todayCount.textContent = appointments.filter((item) => {
    const slotDate = new Date(item.slot);
    return !Number.isNaN(slotDate.getTime()) && isSameDay(slotDate, today);
  }).length;
  pendingCount.textContent = appointments.filter((item) => item.status === "pending").length;
  totalLoads.textContent = appointments.reduce(
    (total, item) => total + Number(item.loads || 0),
    0
  );
};

const renderAppointments = () => {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const statusValue = statusFilter.value;
  const appointments = readAppointments();

  const filtered = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.driverName.toLowerCase().includes(searchTerm) ||
      appointment.plate.toLowerCase().includes(searchTerm) ||
      appointment.trackingCode.toLowerCase().includes(searchTerm);
    const matchesStatus = statusValue ? appointment.status === statusValue : true;
    return matchesSearch && matchesStatus;
  });

  appointmentsBody.innerHTML = "";

  filtered.forEach((appointment) => {
    const row = document.createElement("tr");

    const isPending = appointment.status === "pending";
    const isConfirmed = appointment.status === "confirmed";

    row.innerHTML = `
      <td>${appointment.driverName}</td>
      <td>${appointment.plate}</td>
      <td>${appointment.trackingCode}</td>
      <td>${formatDate(appointment.slot)}</td>
      <td>${appointment.cargoType}</td>
      <td>
        <input
          type="number"
          min="0"
          class="load-input"
          value="${appointment.loads ?? 0}"
          data-id="${appointment.id}"
        />
      </td>
      <td>
        <span class="status ${appointment.status}">${statusLabels[appointment.status]}</span>
      </td>
      <td class="actions">
        <button class="action-btn" data-action="confirm" data-id="${appointment.id}" ${
          isPending ? "" : "disabled"
        }>
          تأیید
        </button>
        <button class="action-btn" data-action="complete" data-id="${appointment.id}" ${
          isConfirmed ? "" : "disabled"
        }>
          انجام شد
        </button>
        <button class="action-btn" data-action="delete" data-id="${appointment.id}">
          حذف
        </button>
      </td>
    `;

    appointmentsBody.appendChild(row);
  });

  emptyState.hidden = filtered.length !== 0;
  updateSummary(appointments);
};

const createAppointment = (data) => ({
  id: crypto.randomUUID(),
  trackingCode: createTrackingCode(),
  driverName: data.driverName.trim(),
  phone: data.phone.trim(),
  plate: data.plate.trim(),
  cargoType: data.cargoType.trim(),
  slot: data.slot,
  notes: data.notes.trim(),
  status: "pending",
  loads: 0,
  createdAt: new Date().toISOString(),
});

const setActivePanel = (panelName) => {
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== panelName;
  });
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === panelName);
  });
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const appointment = createAppointment(Object.fromEntries(formData.entries()));
  const appointments = readAppointments();
  appointments.unshift(appointment);
  saveAppointments(appointments);
  form.reset();
  trackingCodeDisplay.textContent = appointment.trackingCode;
  successMessage.hidden = false;
  setTimeout(() => {
    successMessage.hidden = true;
  }, 3500);
  renderAppointments();
});

appointmentsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const appointments = readAppointments();
  const index = appointments.findIndex((item) => item.id === id);
  if (index === -1) return;

  if (action === "delete") {
    appointments.splice(index, 1);
  }

  if (action === "confirm") {
    appointments[index].status = "confirmed";
  }

  if (action === "complete") {
    appointments[index].status = "completed";
  }

  saveAppointments(appointments);
  renderAppointments();
});

appointmentsBody.addEventListener("input", (event) => {
  const input = event.target.closest("input.load-input");
  if (!input) return;

  const id = input.dataset.id;
  const appointments = readAppointments();
  const target = appointments.find((item) => item.id === id);
  if (!target) return;

  target.loads = Number(input.value || 0);
  saveAppointments(appointments);
  updateSummary(appointments);
});

searchInput.addEventListener("input", renderAppointments);
statusFilter.addEventListener("change", renderAppointments);
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePanel(button.dataset.view);
  });
});

trackingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(trackingForm);
  const trackingValue = String(formData.get("trackingValue") || "").trim();
  if (!trackingValue) return;

  const appointments = readAppointments();
  const appointment = appointments.find(
    (item) =>
      item.trackingCode === trackingValue.toUpperCase() ||
      item.phone.includes(trackingValue)
  );

  if (!appointment) {
    trackingResult.textContent = "هیچ نوبتی با این اطلاعات پیدا نشد.";
  } else {
    trackingResult.innerHTML = `
      <strong>نوبت پیدا شد</strong><br />
      راننده: ${appointment.driverName}<br />
      زمان: ${formatDate(appointment.slot)}<br />
      وضعیت: ${statusLabels[appointment.status]}
    `;
  }

  trackingResult.hidden = false;
});

renderAppointments();
setActivePanel("driver");
