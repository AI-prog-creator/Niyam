// Utility functions for UI
function showSection(id) {
  document.querySelectorAll("main section").forEach((section) => {
    section.style.display = "none";
  });
  const section = document.getElementById(id);
  if (section) {
    section.style.display = "block";
    // Update active navigation link
    document.querySelectorAll("#nav-links a").forEach((link) => {
      link.classList.remove("bg-gray-100", "text-gray-900");
      link.classList.add(
        "text-gray-600",
        "hover:text-gray-900",
        "hover:bg-gray-50"
      );
    });
    const activeLink = document.querySelector(`#nav-links a[href="#${id}"]`);
    if (activeLink) {
      activeLink.classList.remove(
        "text-gray-600",
        "hover:text-gray-900",
        "hover:bg-gray-50"
      );
      activeLink.classList.add("bg-gray-100", "text-gray-900");
    }
  }
}

function showCustomAlert(message) {
  document.getElementById("custom-alert-message").textContent = message;
  document.getElementById("custom-alert-modal").classList.remove("hidden");
}

function hideCustomAlert() {
  document.getElementById("custom-alert-modal").classList.add("hidden");
}

// New Role-based Navigation and Authentication
const loginForm = document.getElementById("login-form");
const registrationForm = document.getElementById("registration-form");
const loginBox = document.getElementById("login-box");
const registrationBox = document.getElementById("registration-box");
const userAuthSection = document.getElementById("user-auth-section");
const mainContent = document.getElementById("main-content");
const navLinksContainer = document.getElementById("nav-links");
const logoutButton = document.getElementById("logout-button");
const showRegistrationLink = document.getElementById("show-registration-link");
const showLoginLink = document.getElementById("show-login-link");

// Function to show the login form and hide the registration form
function showLogin() {
  loginBox.classList.remove("hidden");
  registrationBox.classList.add("hidden");
  document.getElementById("mobile-number").value = ""; // Clear login mobile field
}

// Function to show the registration form and hide the login form
function showRegistrationForm(mobile = "") {
  loginBox.classList.add("hidden");
  registrationBox.classList.remove("hidden");
  document.getElementById("reg-mobile-number").value = mobile;
}

// Function to update the sidebar with user information
function updateUserInfo(user) {
  const userInfoSection = document.getElementById("user-info-section");
  const userName = document.getElementById("user-name");
  const userMobile = document.getElementById("user-mobile");
  const userCity = document.getElementById("user-city");

  if (user) {
    userName.textContent = `${user.full_name}`;
    userMobile.textContent = user.mobile;
    userCity.textContent = user.city;
    userInfoSection.classList.remove("hidden");
  } else {
    userInfoSection.classList.add("hidden");
  }
}

// Handle user login
async function handleLogin(event) {
  event.preventDefault();
  const mobileNumber = document.getElementById("mobile-number").value;
  const pin = document.getElementById("login-pin").value;

  try {
    const response = await fetch("http://localhost:1008/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: mobileNumber,
        pin: pin
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        // User not found, show registration form with pre-filled mobile
        showRegistrationForm(mobileNumber);
        return;
      }
      
      let errorMessage = `Login failed with status: ${response.status}.`;
      if (response.status === 405) {
        errorMessage =
          "Could not connect to the backend server. Please ensure the `server.js` is running on `http://localhost:1008`.";
      } else {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const user = await response.json();

    // Store user data in sessionStorage
    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("role", user.role);
    window.currentUser = user; // Set global current user

    // Redirect to the appropriate dashboard and update UI
    renderDashboard(user);
  } catch (error) {
    console.error("Login failed:", error);
    showCustomAlert(
      error.message || "Login failed. An unexpected error occurred."
    );
  }
}

// Handle user registration
async function handleRegistration(event) {
  event.preventDefault();
  const mobile = document.getElementById("reg-mobile-number").value;
  const fullName = document.getElementById("full-name").value;
  const village = document.getElementById("village").value;
  const city = document.getElementById("city").value;
  const state = document.getElementById("state").value;
  const country = document.getElementById("country").value;
  const pin = document.getElementById("reg-pin").value;

  try {
    const response = await fetch("http://localhost:1008/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile,
        full_name: fullName,
        village,
        city,
        state,
        country,
        pin,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Registration failed.");
    }

    const user = await response.json();

    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("role", user.role);
    window.currentUser = user; // Set global current user

    showCustomAlert("Registration successful! You have been logged in.");
    renderDashboard(user);
  } catch (error) {
    console.error("Registration failed:", error);
    showCustomAlert(
      error.message || "Registration failed. An unexpected error occurred."
    );
  }
}

// Render the correct dashboard and navigation based on user role
function renderDashboard(user) {
  userAuthSection.classList.add("hidden");
  mainContent.classList.remove("hidden");

  const allNavLinks = document.querySelectorAll("#nav-links a");
  allNavLinks.forEach((link) => {
    const linkRole = link.getAttribute("data-role");
    if (user.role === "admin") {
      // Admin sees all links
      link.style.display = "flex";
    } else if (linkRole === "user") {
      // User only sees user links
      link.style.display = "flex";
    } else {
      link.style.display = "none";
    }
  });

  updateUserInfo(user);
  logoutButton.classList.remove("hidden");

  if (user.role === "admin") {
    showSection("admin-dashboard-new"); // New admin dashboard
  } else {
    showSection("user-dashboard-new"); // New user dashboard
  }
  // Also ensure data is loaded for the dashboard
  fetchNiyamForms();
  fetchSubmissions();
  populateFillNiyamFormsDropdown();
  initializeFillNiyamFormState(); // Call this to set initial state for fill-niyam form
}

// Handle user logout
function handleLogout() {
  sessionStorage.clear();
  window.currentUser = null; // Clear global current user
  userAuthSection.classList.remove("hidden");
  mainContent.classList.add("hidden");
  document.getElementById("mobile-number").value = "";
  updateUserInfo(null); // Clear user info from sidebar
  logoutButton.classList.add("hidden");
  showLogin(); // Ensure login form is shown after logout
  showCustomAlert("You have been logged out.");
}

// Handle initial page load
function handleInitialLoad() {
  const storedUser = sessionStorage.getItem("user");
  const storedRole = sessionStorage.getItem("role");
  if (storedUser && storedRole) {
    const user = JSON.parse(storedUser);
    window.currentUser = user; // Set global current user on load
    renderDashboard(user);
  } else {
    userAuthSection.classList.remove("hidden");
    mainContent.classList.add("hidden");
    showLogin();
  }
}

// Event Listeners
loginForm.addEventListener("submit", handleLogin);
registrationForm.addEventListener("submit", handleRegistration);
logoutButton.addEventListener("click", handleLogout);
showRegistrationLink.addEventListener("click", (e) => {
  e.preventDefault();
  showRegistrationForm();
});
showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  showLogin();
});

// Initial load check
window.addEventListener("load", handleInitialLoad);

// Navigation clicks
document.addEventListener("click", function (event) {
  let targetElement = event.target.closest("a");
  if (
    targetElement &&
    targetElement.getAttribute("href") &&
    targetElement.getAttribute("href").startsWith("#")
  ) {
    const sectionId = targetElement.getAttribute("href").substring(1);
    if (sectionId) {
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        event.preventDefault();
        window.location.hash = sectionId;
        showSection(sectionId);
      }
    }
  }
});

// Base URL for your backend API
const API_BASE_URL = "http://localhost:1008/api";

// Global storage for fetched data
window.allNiyamForms = []; // Stores ALL forms (draft, published, expired) for admin
window.allSubmissions = [];
window.currentUser = null; // Stores currently "logged in" user data

// Helper to format date for display
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const createNiyamBtn = document.getElementById("create-niyam-btn");
if (createNiyamBtn) {
  createNiyamBtn.addEventListener("click", () => {
    showSection("form-builder");
  });
}

const backToAdminDashboardBtn = document.getElementById(
  "back-to-admin-dashboard-btn"
);
if (backToAdminDashboardBtn) {
  backToAdminDashboardBtn.addEventListener("click", () => {
    showSection("admin-dashboard");
  });
}

// --- Data Fetching Functions ---

// Fetch Niyam Forms for Admin Dashboard and Niyam Forms sections
async function fetchNiyamForms() {
  try {
    const response = await fetch(`${API_BASE_URL}/niyam-forms`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const forms = await response.json();
    console.log("Fetched Niyam Forms:", forms);

    window.allNiyamForms = forms; // Store ALL forms for admin functions like edit

    // Filter for running forms (published and end_date >= today) for display on dashboards
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const runningPublishedForms = forms.filter((form) => {
      const endDate = new Date(form.end_date);
      endDate.setHours(0, 0, 0, 0);
      return form.status === "Published" && endDate >= today;
    });

    // Update Admin Dashboard Stats
    document.getElementById("niyam-forms-running-count").textContent =
      runningPublishedForms.length;
    document.getElementById("niyam-forms-published-count").textContent =
      forms.filter((f) => f.status === "Published").length;

    // Populate Admin Dashboard table (all forms, not just running)
    const niyamFormsTbody = document.getElementById("niyam-forms-table-body");
    if (niyamFormsTbody) {
      niyamFormsTbody.innerHTML = "";
      if (forms.length === 0) {
        niyamFormsTbody.innerHTML =
          '<tr><td colspan="6" class="text-center py-4 text-gray-500">No Niyam Forms found.</td></tr>';
      } else {
        forms.forEach((form) => {
          let actions = "";
          if (form.status === "Published") {
            actions = `
                  <button class="text-blue-600 hover:text-blue-900 mr-2" onclick="viewNiyamFormDetails(${form.id})">View</button>
                  <button class="text-yellow-600 hover:text-yellow-900 mr-2" onclick="updateNiyamFormStatus(${form.id}, 'Draft')">Unpublish</button>
                  <button class="text-gray-600 hover:text-gray-900 mr-2" onclick="copyPublicLink('${form.public_id}')">Copy Link</button>
                  <button class="text-red-600 hover:text-red-900" onclick="deleteNiyamForm(${form.id})">Delete</button>
                `;
          } else {
            // Draft
            actions = `
                  <button class="text-yellow-600 hover:text-yellow-900 mr-2" onclick="editNiyamForm(${form.id})">Edit</button>
                  <button class="text-green-600 hover:text-green-900 mr-2" onclick="updateNiyamFormStatus(${form.id}, 'Published')">Publish</button>
                  <button class="text-red-600 hover:text-red-900" onclick="deleteNiyamForm(${form.id})">Delete</button>
                `;
          }
          const row = `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${
                      form.niyam_name
                    }</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      form.status === "Published"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }">${form.status}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(
                    form.start_date
                  )}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(
                    form.end_date
                  )}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    form.participant_count || 0
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${actions}
                  </td>
                </tr>
              `;
          niyamFormsTbody.innerHTML += row;
        });
      }
    }

    // Populate filter dropdowns for submissions and reports (only published forms)
    const filterFormSelect = document.getElementById("filter-form");
    const reportFormSelect = document.getElementById("report-form");
    const submissionFormSelect = document.getElementById(
      "submission-form-name"
    );

    [filterFormSelect, reportFormSelect, submissionFormSelect].forEach(
      (select) => {
        if (select) {
          if (select.querySelector('option[value=""]')) {
            select.innerHTML = '<option value="">All Forms</option>'; // Keep 'All Forms' for filters
          } else {
            select.innerHTML = '<option value="">Select a Niyam Form</option>'; // For submission form
          }
          runningPublishedForms.forEach((form) => {
            const option = document.createElement("option");
            option.value = form.niyam_name;
            option.textContent = form.niyam_name;
            option.dataset.formId = form.id;
            option.dataset.formOptions = JSON.stringify(form.options);
            option.dataset.takerDetailsRequired = JSON.stringify(
              form.taker_details_required
            );
            select.appendChild(option);
          });
        }
      }
    );

    // Populate User Dashboard running niyams
    const userRunningNiyamsList = document.getElementById(
      "user-running-niyams-list"
    );
    if (userRunningNiyamsList) {
      userRunningNiyamsList.innerHTML = "";
      if (runningPublishedForms.length === 0) {
        userRunningNiyamsList.innerHTML =
          '<li><div class="px-6 py-4 text-center text-gray-500">No active Niyam Forms available.</div></li>';
      } else {
        runningPublishedForms.forEach((form) => {
          const listItem = `
                <li>
                  <div class="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div>
                      <h4 class="text-lg font-medium text-gray-900">${
                        form.niyam_name
                      }</h4>
                      <p class="text-sm text-gray-500">
                        ${form.description || "No description provided."}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        ${formatDate(form.start_date)} - ${formatDate(
            form.end_date
          )}
                      </p>
                    </div>
                    <a href="#fill-niyam" onclick="preselectFillNiyamForm('${
                      form.niyam_name
                    }')"
                       class="mt-3 sm:mt-0 sm:ml-4 px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                      Fill Niyam
                    </a>
                  </div>
                </li>
              `;
          userRunningNiyamsList.innerHTML += listItem;
        });
      }
    }
  } catch (error) {
    console.error("Error fetching Niyam forms:", error);
    showCustomAlert("Failed to load Niyam forms. Please check backend server.");
    document.getElementById("niyam-forms-table-body").innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-red-500">Error loading data.</td></tr>';
  }
}

// Function to fetch and display Submissions
async function fetchSubmissions() {
  try {
    const response = await fetch(`${API_BASE_URL}/submissions`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const submissions = await response.json();
    console.log("Fetched Submissions:", submissions);
    window.allSubmissions = submissions; // Store for viewSubmission

    // Update Admin Dashboard Stats: Total Niyam Takers
    const uniqueTakers = new Set(submissions.map((s) => s.mobile));
    document.getElementById("niyam-forms-total-participants").textContent =
      uniqueTakers.size;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const activeToday = new Set(
      submissions
        .filter((s) => s.submission_date.startsWith(today))
        .map((s) => s.mobile)
    );
    // document.getElementById('dashboard-active-today').textContent = activeToday.size; // This element was removed from admin-dashboard-new

    const adminTbody = document.getElementById("niyam-forms-table-body");
    if (adminTbody && window.allNiyamForms) {
      // Re-render the admin forms table to update participant counts
      // This is a bit inefficient, but ensures consistency after submissions are fetched
      fetchNiyamForms();
    }

    const tbody = document.getElementById("submissions-tbody");
    if (tbody) {
      tbody.innerHTML = ""; // Clear existing content
      if (submissions.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="9" class="text-center py-4 text-gray-500">No submissions found.</td></tr>';
      } else {
        submissions.forEach((submission) => {
          const niyamsText = Object.entries(submission.niyams)
            .map(([key, value]) => {
              // Handle complex Niyam values (e.g., objects from text/number inputs)
              if (Array.isArray(value)) {
                return `${
                  key.charAt(0).toUpperCase() + key.slice(1)
                }: ${value.join(", ")}`;
              }
              return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
            })
            .join(", ");

          const row = `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                    submission.form_name
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
                    submission.name
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    submission.mobile
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    submission.village
                  }</td>
                  <td class="px-6 py-4 text-sm text-gray-500">${niyamsText}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    submission.niyam_give_by_name || "N/A"
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    submission.niyam_give_by_number || "N/A"
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(
                    submission.submission_date
                  )}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewSubmission(${
                      submission.id
                    })" class="text-blue-600 hover:text-blue-900">View</button>
                  </td>
                </tr>
              `;
          tbody.innerHTML += row;
        });
      }
    }
  } catch (error) {
    console.error("Error fetching submissions:", error);
    showCustomAlert("Failed to load submissions. Please check backend server.");
    document.getElementById("submissions-tbody").innerHTML =
      '<tr><td colspan="9" class="text-center py-4 text-red-500">Error loading data.</td></tr>';
  }
}

// View submission details (uses fetched data)
function viewSubmission(id) {
  const submission = window.allSubmissions.find((s) => s.id === id);
  if (!submission) {
    showCustomAlert("Submission details not found.");
    return;
  }

  const modal = document.getElementById("submission-modal");
  const content = document.getElementById("modal-content");

  const niyamsHtml = Object.entries(submission.niyams)
    .map(([key, value]) => {
      let displayValue = value;
      if (Array.isArray(value)) {
        displayValue = value.join(", "); // For checkboxes
      }
      return `<p><strong>${
        key.charAt(0).toUpperCase() + key.slice(1)
      }:</strong> ${displayValue}</p>`;
    })
    .join("");

  content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="font-medium text-gray-900">Form Details</h4>
            <p><strong>Form:</strong> ${submission.form_name}</p>
            <p><strong>Submitted:</strong> ${formatDate(
              submission.submission_date
            )}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900">Participant Details</h4>
            <p><strong>Name:</strong> ${submission.name}</p>
            <p><strong>Mobile:</strong> ${submission.mobile}</p>
            <p><strong>Village:</strong> ${submission.village}</p>
            <p><strong>City:</strong> ${submission.city || "N/A"}</p>
            <p><strong>User Type:</strong> ${
              submission.user_type === "self" ? "Self" : "Other"
            }</p>
            <p><strong>Niyam Given By Name:</strong> ${
              submission.niyam_give_by_name || "N/A"
            }</p>
            <p><strong>Niyam Given By Number:</strong> ${
              submission.niyam_give_by_number || "N/A"
            }</p>
          </div>
        </div>
        <div>
          <h4 class="font-medium text-gray-900 mt-4">Niyams Taken</h4>
          <div class="bg-gray-50 p-4 rounded-md">
            ${niyamsHtml}
          </div>
        </div>
      `;

  modal.classList.remove("hidden");
}

// Close submission modal
document.getElementById("close-modal").addEventListener("click", function () {
  document.getElementById("submission-modal").classList.add("hidden");
});

// Apply filters for submissions
document.getElementById("apply-filters").addEventListener("click", function () {
  const formFilter = document.getElementById("filter-form").value;
  const mobileFilter = document.getElementById("filter-mobile").value;
  const startDateFilter = document.getElementById("filter-start-date").value;
  const endDateFilter = document.getElementById("filter-end-date").value;

  let filteredSubmissions = window.allSubmissions;

  // Filter by form name
  if (formFilter) {
    filteredSubmissions = filteredSubmissions.filter(
      (s) => s.form_name === formFilter
    );
  }

  // Filter by mobile number
  if (mobileFilter) {
    filteredSubmissions = filteredSubmissions.filter(
      (s) =>
        (s.mobile && s.mobile.includes(mobileFilter)) ||
        (s.niyam_give_by_number &&
          s.niyam_give_by_number.includes(mobileFilter))
    );
  }

  // Filter by date range
  if (startDateFilter) {
    filteredSubmissions = filteredSubmissions.filter(
      (s) => s.submission_date.slice(0, 10) >= startDateFilter
    );
  }
  if (endDateFilter) {
    filteredSubmissions = filteredSubmissions.filter(
      (s) => s.submission_date.slice(0, 10) <= endDateFilter
    );
  }

  // Update the table with filtered results
  const tbody = document.getElementById("submissions-tbody");
  if (tbody) {
    tbody.innerHTML = "";
    if (filteredSubmissions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="text-center py-4 text-gray-500">No submissions found matching the filters.</td></tr>';
    } else {
      filteredSubmissions.forEach((submission) => {
        const niyamsText = Object.entries(submission.niyams)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${
                key.charAt(0).toUpperCase() + key.slice(1)
              }: ${value.join(", ")}`;
            }
            return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
          })
          .join(", ");

        const row = `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                  submission.form_name
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
                  submission.name
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  submission.mobile
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  submission.village
                }</td>
                <td class="px-6 py-4 text-sm text-gray-500">${niyamsText}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  submission.niyam_give_by_name || "N/A"
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  submission.niyam_give_by_number || "N/A"
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(
                  submission.submission_date
                )}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onclick="viewSubmission(${
                    submission.id
                  })" class="text-blue-600 hover:text-blue-900">View</button>
                </td>
              </tr>
            `;
        tbody.innerHTML += row;
      });
    }
  }
});

// --- Dynamic Form Builder Logic ---
let niyamFieldCounter = 0;

function addNiyamField() {
  niyamFieldCounter++;
  const container = document.getElementById("niyam-fields-container");
  const placeholder = container.querySelector("p.text-gray-500");
  if (placeholder) {
    placeholder.remove();
  }

  const fieldId = `niyam-field-${niyamFieldCounter}`;
  const niyamTypeInputId = `niyam-type-${niyamFieldCounter}`;
  const optionTypeSelectId = `niyam-option-type-${niyamFieldCounter}`;
  const optionsContainerId = `niyam-options-container-${niyamFieldCounter}`;

  const fieldHtml = `
        <div class="border border-gray-200 rounded-md p-4 relative" id="${fieldId}">
          <button type="button" class="absolute top-2 right-2 text-red-500 hover:text-red-700" onclick="removeNiyamField('${fieldId}')">
            <i class="fas fa-times-circle"></i>
          </button>
          <div class="mb-3">
            <label for="${niyamTypeInputId}" class="block text-sm font-medium text-gray-700 mb-2">
              Niyam Type Name *
            </label>
            <input type="text" id="${niyamTypeInputId}" required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Mala, Dandvat, Vachnamrut">
          </div>
          <div class="mb-3">
            <label for="${optionTypeSelectId}" class="block text-sm font-medium text-gray-700 mb-2">
              Input Type
            </label>
            <select id="${optionTypeSelectId}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              onchange="toggleNiyamOptions('${optionsContainerId}', this.value, ${niyamFieldCounter})">
              <option value="checkbox">Checkboxes (Multiple Select)</option>
              <option value="radio">Radio Buttons (Single Select)</option>
              <option value="text">Text Input (e.g., Note)</option>
              <option value="number">Number Input (e.g., Breakdown)</option>
            </select>
          </div>
          <div id="${optionsContainerId}" class="space-y-2 border border-gray-300 p-3 rounded-md">
            <label class="block text-sm text-gray-600">Define options:</label>
            <div id="options-list-${niyamFieldCounter}">
              <!-- Options inputs will be added here -->
            </div>
            <button type="button" class="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    onclick="addOptionToNiyamField(${niyamFieldCounter})">
              Add Option
            </button>
          </div>
        </div>
      `;
  container.insertAdjacentHTML("beforeend", fieldHtml);
  // Automatically add one option for checkbox/radio initially
  addOptionToNiyamField(niyamFieldCounter);
  toggleNiyamOptions(
    optionsContainerId,
    document.getElementById(optionTypeSelectId).value,
    niyamFieldCounter
  ); // Ensure initial state is correct
}

function removeNiyamField(fieldId) {
  document.getElementById(fieldId).remove();
  const container = document.getElementById("niyam-fields-container");
  if (container.children.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center">Click "Add Niyam Field" to define options.</p>';
  }
}

function addOptionToNiyamField(fieldNum) {
  const optionsListContainer = document.getElementById(
    `options-list-${fieldNum}`
  );
  const optionId = `niyam-option-${fieldNum}-${
    optionsListContainer.children.length + 1
  }`;
  const optionHtml = `
        <div class="flex items-center space-x-2 mb-2" id="${optionId}">
          <input type="text" class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="Option value (e.g., 5, 11, Yes, No)">
          <button type="button" class="text-red-500 hover:text-red-700" onclick="removeOption('${optionId}')">
            <i class="fas fa-times-circle"></i>
          </button>
        </div>
      `;
  optionsListContainer.insertAdjacentHTML("beforeend", optionHtml);
}

function removeOption(optionId) {
  document.getElementById(optionId).remove();
}

function toggleNiyamOptions(optionsContainerId, selectedType, fieldNum) {
  const optionsContainer = document.getElementById(optionsContainerId);
  const optionsList = document.getElementById(`options-list-${fieldNum}`);
  const addOptionButton = optionsContainer.querySelector(
    'button[onclick^="addOptionToNiyamField"]'
  );
  const label = optionsContainer.querySelector("label");

  if (selectedType === "checkbox" || selectedType === "radio") {
    optionsContainer.classList.remove("hidden");
    if (optionsList) optionsList.classList.remove("hidden");
    if (addOptionButton) addOptionButton.classList.remove("hidden");
    if (label) label.textContent = "Define options:";
    if (optionsList.children.length === 0) {
      // Ensure at least one option input is present
      addOptionToNiyamField(fieldNum);
    }
  } else {
    optionsContainer.classList.add("hidden");
    if (optionsList) optionsList.classList.add("hidden");
    if (addOptionButton) addOptionButton.classList.add("hidden");
    optionsList.innerHTML = ""; // Clear options if switching away from checkbox/radio
  }
}

document
  .getElementById("add-niyam-field-btn")
  .addEventListener("click", addNiyamField);

// Function to handle form submission for creating a new Niyam Form
// REPLACE your old 'niyam-form-builder' submit listener with this:
document
  .getElementById("niyam-form-builder")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData();
    const isEditMode = this.dataset.editMode === "true";
    const formId = this.dataset.editFormId;

    // 1. Collect and append text data
    formData.append("niyamName", document.getElementById("form-name").value);
    formData.append("startDate", document.getElementById("start-date").value);
    formData.append("endDate", document.getElementById("end-date").value);
  formData.append("description", window.quill.root.innerHTML);
    formData.append(
      "status",
      event.submitter.id === "save-publish" ? "Published" : "Draft"
    );

    const takerDetailsRequired = {
      name: document.getElementById("require-name").checked,
      village: document.getElementById("require-village").checked,
      mobile: document.getElementById("require-mobile").checked,
    };
    formData.append(
      "takerDetailsRequired",
      JSON.stringify(takerDetailsRequired)
    );

    // 2. Collect and append dynamic niyam fields as a JSON string
    const niyamOptions = {};
    const niyamFields = document.querySelectorAll(
      '#niyam-fields-container > div[id^="niyam-field-"]'
    );
    if (niyamFields.length === 0) {
      showCustomAlert("Please add at least one Niyam Field.");
      return;
    }

    let allNiyamFieldsValid = true;
    niyamFields.forEach((field) => {
      const idSuffix = field.id.split("-")[2];
      const niyamTypeInput = document.getElementById(`niyam-type-${idSuffix}`);
      const optionTypeSelect = document.getElementById(
        `niyam-option-type-${idSuffix}`
      );
      const optionsListContainer = document.getElementById(
        `options-list-${idSuffix}`
      );
      const niyamType = niyamTypeInput.value.trim().toLowerCase();
      const inputType = optionTypeSelect.value;
      let optionsArray = [];
      if (niyamType === "") allNiyamFieldsValid = false;
      if (inputType === "checkbox" || inputType === "radio") {
        const optionInputs =
          optionsListContainer.querySelectorAll('input[type="text"]');
        if (optionInputs.length === 0) allNiyamFieldsValid = false;
        optionInputs.forEach((input) => {
          if (input.value.trim() !== "") optionsArray.push(input.value.trim());
        });
        if (optionsArray.length === 0) allNiyamFieldsValid = false;
      }
      niyamOptions[niyamType] = { type: inputType, options: optionsArray };
    });

    if (!allNiyamFieldsValid) {
      showCustomAlert(
        "Please fill out all Niyam Type names and their options correctly."
      );
      return;
    }
    formData.append("options", JSON.stringify(niyamOptions));

    // 3. Collect and append image files
    const imagesInput = document.getElementById("niyam-images");
    const files = Array.from(imagesInput.files).slice(0, 3);
    files.forEach((file) => {
      formData.append("images", file);
    });

    // --- FIX APPLIED: Handle both CREATE (POST) and UPDATE (PUT) ---
    try {
      let response;
      if (isEditMode) {
        // UPDATE existing form
        response = await fetch(`${API_BASE_URL}/niyam-forms/${formId}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        // CREATE new form
        response = await fetch(`${API_BASE_URL}/niyam-forms`, {
          method: "POST",
          body: formData,
        });
      }

      const result = await response.json();

      if (response.ok) {
        showCustomAlert(result.message || "Niyam form saved successfully!");
        this.reset();
        window.quill.setContents([]);
        document.getElementById("niyam-images-preview").innerHTML = "";
        document.getElementById("niyam-fields-container").innerHTML =
          '<p class="text-gray-500 text-center">Click "Add Niyam Field" to define options.</p>';

        // Reset edit mode flags
        this.dataset.editMode = "false";
        delete this.dataset.editFormId;

        showSection("admin-dashboard-new");
        fetchNiyamForms();
      } else {
        showCustomAlert(
          `Error: ${result.message || "Failed to save Niyam form."}`
        );
      }
    } catch (error) {
      console.error("Error submitting Niyam form:", error);
      showCustomAlert(
        "Failed to connect to the server or an unexpected error occurred."
      );
    }
  });
// Preview selected images
document
  .getElementById("niyam-images")
  .addEventListener("change", function (e) {
    const preview = document.getElementById("niyam-images-preview");
    preview.innerHTML = "";
    const files = Array.from(e.target.files).slice(0, 3); // Max 3 images
    files.forEach((file) => {
      if (!["image/jpeg", "image/png"].includes(file.type)) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = document.createElement("img");
        img.src = ev.target.result;
        img.className = "h-24 w-auto rounded shadow mb-2";
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

// // On form submit, send images as FormData
// document.getElementById('niyam-form-builder').addEventListener('submit', async function (e) {
//     e.preventDefault();
//     // ...collect other form fields...
//     const formData = new FormData(this);
//     // Only keep max 3 images
//     const imagesInput = document.getElementById('niyam-images');
//     Array.from(imagesInput.files).slice(0, 3).forEach((file, idx) => {
//         formData.append('images', file);
//     });
//     // ...append other fields to formData as needed...

//     // Send to backend
//     const res = await fetch('/api/niyam-forms', {
//         method: 'POST',
//         body: formData
//     });
//     // ...handle response...
// });

// Function to update Niyam Form Status (Publish/Unpublish)
async function updateNiyamFormStatus(id, newStatus) {
  if (
    !confirm(
      `Are you sure you want to ${newStatus.toLowerCase()} this Niyam form?`
    )
  ) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/niyam-forms/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: newStatus,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      showCustomAlert(
        result.message ||
          `Niyam form status updated to ${newStatus} successfully!`
      );
      fetchNiyamForms(); // Reload forms
    } else {
      showCustomAlert(
        `Error: ${result.message || "Failed to update Niyam form status."}`
      );
    }
  } catch (error) {
    console.error("Error updating Niyam form status:", error);
    showCustomAlert(
      "Failed to connect to the server or an unexpected error occurred."
    );
  }
}

// View Niyam Form Details (Preview Modal)
function viewNiyamFormDetails(formId) {
  const form = window.allNiyamForms.find((f) => f.id === formId);

  console.log("--- Debugging Niyam Form Details ---");
  console.log("Found form object:", form);
  if (form) {
    console.log("The 'image' property is:", form.image);
    console.log("The type of 'image' property is:", typeof form.image);
  }
  console.log("------------------------------------");
  if (!form) {
    showCustomAlert("Form details not found.");
    return;
  }

  // --- FIX APPLIED: Properly display images ---
  let imagesHtml = '<p class="text-sm text-gray-500">No images provided.</p>';
  let imagePaths = [];

  try {
    if (form.image && typeof form.image === "string") {
      imagePaths = JSON.parse(form.image); // this gives you an array
    }
  } catch (e) {
    console.error("Could not parse image JSON:", form.image, e);
  }

  if (Array.isArray(imagePaths) && imagePaths.length > 0) {
    // If you just want the first image (without brackets)
    const firstImage = imagePaths[0];
    imagesHtml = `<img src="http://localhost:1008${firstImage}" 
                   alt="Niyam Image" 
                   class="h-24 w-auto rounded-md shadow-md object-cover mr-2 mb-2">`;
  }

  // Create preview modal content that shows the form exactly as a user would fill it
  const previewContent = `
        <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h3 class="text-xl font-bold text-gray-900">નિયમ અભિયાન - ${
                form.niyam_name
              }</h3>
              <button onclick="closePreviewModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <p class="text-sm text-gray-600 mt-1">તમારા નિયમની વિગતો ઉમેરો...</p>
          </div>
          <div class="p-6">
            <form class="space-y-6">
              <!-- Form Selection (Pre-filled) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  નિયમ *
                </label>
                <select class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50" disabled>
                  <option value="${form.niyam_name}" selected>${
    form.niyam_name
  }</option>
                </select>
              </div>
               <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">નિયમ ઈમેજીસ</label>
                <div   >
                    ${imagesHtml}
                </div>
            </div>
              <!-- Mobile Number -->
              ${
                form.taker_details_required?.mobile
                  ? `
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    મોબાઈલ નંબર *
                  </label>
                  <input type="tel" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                    placeholder="તમારો મોબાઈલ નંબર ઉમેરો" disabled>
                </div>
              `
                  : ""
              }

              <!-- User Type Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  નિયમ કોના માટે ભરવું છે? *
                </label>
                <div class="space-x-4">
                  <label class="inline-flex items-center">
                    <input type="radio" name="preview-user-type" value="self" checked disabled
                      class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                    <span class="ml-2 text-sm text-gray-700">મારા માટે</span>
                  </label>
                  <label class="inline-flex items-center">
                    <input type="radio" name="preview-user-type" value="other" disabled
                      class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                    <span class="ml-2 text-sm text-gray-700">બિજા હરિ ભક્તો માટે</span>
                  </label>
                </div>
              </div>

              <!-- User Details Section (for "other" type) -->
              <div class="space-y-4">
                ${
                  form.taker_details_required?.name
                    ? `
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                      placeholder="Enter full name" disabled>
                  </div>
                `
                    : ""
                }
                ${
                  form.taker_details_required?.village
                    ? `
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Village *</label>
                    <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                      placeholder="Enter village" disabled>
                  </div>
                `
                    : ""
                }
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                    placeholder="Enter city" disabled>
                </div>
                ${
                  form.taker_details_required?.mobile
                    ? `
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                    <input type="tel" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                      placeholder="Enter mobile number" disabled>
                  </div>
                `
                    : ""
                }
              </div>

              <!-- Niyam Options -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Select Niyam *
                </label>
                <div class="space-y-4">
                  ${Object.entries(form.options || {})
                    .map(
                      ([niyamType, config]) => `
                    <div class="border border-gray-200 rounded-md p-4">
                      <h5 class="font-medium text-gray-900 mb-2">${
                        niyamType.charAt(0).toUpperCase() + niyamType.slice(1)
                      }</h5>
                      ${
                        config.type === "checkbox"
                          ? `<div class="space-y-2">
                          ${config.options
                            .map(
                              (option) => `
                            <label class="inline-flex items-center">
                              <input type="checkbox" name="preview-niyam-${niyamType}" value="${option}" disabled
                                class="rounded border-gray-300 text-indigo-600 shadow-sm">
                              <span class="ml-2 text-sm">${option}</span>
                            </label>
                          `
                            )
                            .join("")}
                        </div>`
                          : config.type === "radio"
                          ? `<div class="space-y-2">
                          ${config.options
                            .map(
                              (option) => `
                            <label class="inline-flex items-center">
                              <input type="radio" name="preview-niyam-${niyamType}" value="${option}" disabled
                                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                              <span class="ml-2 text-sm">${option}</span>
                            </label>
                          `
                            )
                            .join("")}
                        </div>`
                          : config.type === "select"
                          ? `<select class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50" disabled>
                          <option value="">Select ${niyamType}</option>
                          ${config.options
                            .map(
                              (option) => `
                            <option value="${option}">${option}</option>
                          `
                            )
                            .join("")}
                        </select>`
                          : `<input type="${config.type}" placeholder="Enter ${niyamType}"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50" disabled>`
                      }
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>

              <!-- Optional Description -->
              <div>
                <div class="text-gray-700 text-base min-h-[32px] p-0 m-0" style="background:none;border:none;box-shadow:none;min-height:32px;">
                  ${(form.description && form.description.trim() !== "")
                    ? form.description
                    : '<span class="text-gray-400">No description provided.</span>'}
                </div>
              </div>

              <!-- Submit Buttons (Disabled) -->
              <div class="flex justify-end space-x-3">
                <button type="button" disabled
                  class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
                  Save as Draft
                </button>
                <button type="button" disabled
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
                  Submit Niyam
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

  // Show modal
  const modal = document.getElementById("preview-modal");
  const modalContent = document.getElementById("preview-modal-content");
  modalContent.innerHTML = previewContent;
  modal.classList.remove("hidden");
}

// Close preview modal
function closePreviewModal() {
  document.getElementById("preview-modal").classList.add("hidden");
}

// Close preview modal when clicking outside
document
  .getElementById("preview-modal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      closePreviewModal();
    }
  });

// Edit Niyam Form
async function editNiyamForm(formId) {
  try {
    const response = await fetch(`${API_BASE_URL}/niyam-forms/${formId}`);
    if (!response.ok) {
      throw new Error("Form not found or error fetching details.");
    }
    const form = await response.json();

    // Navigate to form builder and populate with existing data
    showSection("form-builder");

    // Populate form fields
    document.getElementById("form-name").value = form.niyam_name;
    document.getElementById("start-date").value = form.start_date.slice(0, 10);
    document.getElementById("end-date").value = form.end_date.slice(0, 10);
    if (window.quill) {
      window.quill.root.innerHTML = form.description || "";
    } else {
      document.getElementById("description").value = form.description || "";
    }

    // Set required fields checkboxes
    if (form.taker_details_required) {
      document.getElementById("require-name").checked =
        form.taker_details_required.name;
      document.getElementById("require-village").checked =
        form.taker_details_required.village;
      document.getElementById("require-mobile").checked =
        form.taker_details_required.mobile;
    }

    // Clear existing niyam fields and add the form's options
    document.getElementById("niyam-fields-container").innerHTML = "";
    niyamFieldCounter = 0; // Reset counter for editing

    if (form.options) {
      Object.entries(form.options).forEach(([niyamType, config]) => {
        addNiyamField();
        const fieldId = document.querySelector(
          "#niyam-fields-container > div:last-child"
        ).id;
        const idSuffix = fieldId.split("-")[2];

        // Set niyam type name
        document.getElementById(`niyam-type-${idSuffix}`).value = niyamType;

        // Set input type
        document.getElementById(`niyam-option-type-${idSuffix}`).value =
          config.type;

        // Add options
        const optionsList = document.getElementById(`options-list-${idSuffix}`);
        optionsList.innerHTML = ""; // Clear initial option added by addNiyamField
        if (config.options && config.options.length > 0) {
          config.options.forEach((option, index) => {
            addOptionToNiyamField(parseInt(idSuffix));
            const lastOption = optionsList.lastElementChild;
            if (lastOption) {
              lastOption.querySelector("input").value = option;
            }
          });
        } else {
          // If no options (e.g., for text/number fields), ensure the container is hidden
          toggleNiyamOptions(
            `niyam-options-container-${idSuffix}`,
            config.type,
            parseInt(idSuffix)
          );
        }

        // Trigger change event to show/hide options container
        document
          .getElementById(`niyam-option-type-${idSuffix}`)
          .dispatchEvent(new Event("change"));
      });
    }

    // Change form action to update instead of create
    const formElement = document.getElementById("niyam-form-builder");
    formElement.dataset.editMode = "true";
    formElement.dataset.editFormId = formId;

    // Update submit buttons
    document.getElementById("save-draft").textContent = "Update Draft";
    document.getElementById("save-publish").textContent = "Update & Publish";
  } catch (error) {
    console.error("Error editing Niyam form:", error);
    showCustomAlert(
      error.message || "Failed to load form details for editing."
    );
  }
}

// Function to delete Niyam Form
async function deleteNiyamForm(id) {
  if (
    !confirm(
      "Are you sure you want to delete this Niyam form? This action cannot be undone."
    )
  ) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/niyam-forms/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();
    if (response.ok) {
      showCustomAlert(result.message || "Niyam form deleted successfully!");
      fetchNiyamForms(); // Reload forms
    } else {
      showCustomAlert(
        `Error: ${result.message || "Failed to delete Niyam form."}`
      );
    }
  } catch (error) {
    console.error("Error deleting Niyam form:", error);
    showCustomAlert(
      "Failed to connect to the server or an unexpected error occurred."
    );
  }
}

// Copy Public Link
// REPLACE the existing copyPublicLink function in logic.js

function copyPublicLink(publicId) {
  // Correctly point to index.html with the query parameter
  const publicLink = `${window.location.origin}/index.html?formId=${publicId}`;
  navigator.clipboard
    .writeText(publicLink)
    .then(() => {
      showCustomAlert("Public link copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
      showCustomAlert(
        "Failed to copy link. Please copy manually: " + publicLink
      );
    });
}

// Pre-select form in Fill Niyam section if navigated from User Dashboard
function preselectFillNiyamForm(formName) {
  const selectElement = document.getElementById("submission-form-name");
  if (selectElement) {
    // Find the option by text content (niyam_name)
    for (let i = 0; i < selectElement.options.length; i++) {
      if (selectElement.options[i].textContent === formName) {
        selectElement.selectedIndex = i;
        // Manually trigger change event to populate dynamic options
        const event = new Event("change");
        selectElement.dispatchEvent(event);
        break;
      }
    }
  }
  showSection("fill-niyam"); // Navigate to fill niyam section
}
window.preselectFillNiyamForm = preselectFillNiyamForm; // Make globally accessible
window.viewNiyamFormDetails = viewNiyamFormDetails; // Make globally accessible
window.closePreviewModal = closePreviewModal; // Make globally accessible
window.editNiyamForm = editNiyamForm; // Make globally accessible
window.deleteNiyamForm = deleteNiyamForm; // Make globally accessible
window.updateNiyamFormStatus = updateNiyamFormStatus; // Make globally accessible
window.copyPublicLink = copyPublicLink; // Make globally accessible

// Populate Niyam Forms dropdown in Fill Niyam section
async function populateFillNiyamFormsDropdown() {
  const selectElement = document.getElementById("submission-form-name");
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">Loading forms...</option>';
  try {
    const response = await fetch(`${API_BASE_URL}/niyam-forms`);
    if (!response.ok) throw new Error("Failed to fetch forms");
    const forms = await response.json();

    if (form.description && form.description.trim() !== "") {
      document.getElementById("user-niyam-description").innerHTML =
        form.description;
      document.getElementById("user-niyam-description").style.display = "block";
    } else {
      document.getElementById("user-niyam-description").style.display = "none";
    }

    selectElement.innerHTML = '<option value="">Select a Niyam Form</option>';
    forms
      .filter((form) => form.status === "Published")
      .forEach((form) => {
        const option = document.createElement("option");
        option.value = form.niyam_name;
        option.textContent = form.niyam_name;
        option.dataset.formId = form.id; // Store form ID
        option.dataset.formOptions = JSON.stringify(form.options); // Still stringify for dataset attribute
        option.dataset.takerDetailsRequired = JSON.stringify(
          form.taker_details_required
        ); // New: Store taker details requirement
        selectElement.appendChild(option);
      });
  } catch (error) {
    console.error("Error populating fill niyam forms:", error);
    selectElement.innerHTML = '<option value="">Failed to load forms</option>';
  }
}

// Function to initialize the state of the fill-niyam form based on logged-in user
function initializeFillNiyamFormState() {
  const submissionMobileInput = document.getElementById(
    "submission-mobile-number"
  );
  const submissionUserTypeSelfRadio = document.querySelector(
    'input[name="submission-user-type"][value="self"]'
  );

  if (
    window.currentUser &&
    submissionMobileInput &&
    submissionUserTypeSelfRadio
  ) {
    // Set default mobile number to logged-in user's mobile
    submissionMobileInput.value = window.currentUser.mobile;
    submissionMobileInput.readOnly = true; // Make it view-only

    // Ensure 'self' radio is checked by default and trigger its change event
    submissionUserTypeSelfRadio.checked = true;
    // Manually dispatch change event to populate user details section for 'self'
    submissionUserTypeSelfRadio.dispatchEvent(new Event("change"));
  } else if (submissionMobileInput) {
    // If no user is logged in, ensure mobile is editable
    submissionMobileInput.value = "";
    submissionMobileInput.readOnly = false;
  }
}

// Handle change on Niyam Form selection in Fill Niyam section
document
  .getElementById("submission-form-name")
  .addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    const dynamicOptionsContainer = document.getElementById(
      "dynamic-niyam-options"
    );
    const submissionUserTypeSelfRadio = document.querySelector(
      'input[name="submission-user-type"][value="self"]'
    );

    dynamicOptionsContainer.innerHTML = ""; // Clear previous options

    // Reset radio buttons to 'self' and trigger change to re-evaluate user details section
    if (submissionUserTypeSelfRadio) {
      submissionUserTypeSelfRadio.checked = true;
      submissionUserTypeSelfRadio.dispatchEvent(new Event("change"));
    }

    if (selectedOption && selectedOption.dataset.formOptions) {
      const formOptions = JSON.parse(selectedOption.dataset.formOptions);

      if (Object.keys(formOptions).length === 0) {
        dynamicOptionsContainer.innerHTML =
          '<p class="text-gray-500">No specific Niyams defined for this form. You can still submit general details.</p>';
        return;
      }

      for (const niyamType in formOptions) {
        const fieldConfig = formOptions[niyamType];
        const options = fieldConfig.options;
        const type = fieldConfig.type; // 'checkbox', 'radio', 'text', 'number'

        let inputHtml = "";
        if (type === "checkbox") {
          inputHtml = options
            .map(
              (optionValue) => `
              <label class="flex items-center">
                <input type="checkbox" name="niyam-${niyamType}" value="${optionValue}"
                  class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                <span class="ml-2 text-sm">${optionValue}</span>
              </label>
            `
            )
            .join("");
        } else if (type === "radio") {
          inputHtml = options
            .map(
              (optionValue) => `
              <label class="flex items-center">
                <input type="radio" name="niyam-${niyamType}" value="${optionValue}"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                <span class="ml-2 text-sm">${optionValue}</span>
              </label>
            `
            )
            .join("");
        } else if (type === "text") {
          inputHtml = `<input type="text" name="niyam-${niyamType}" placeholder="Enter ${niyamType}"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">`;
        } else if (type === "number") {
          inputHtml = `<input type="number" name="niyam-${niyamType}" placeholder="Enter ${niyamType} count"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">`;
        }

        const niyamHtml = `
            <div class="border border-gray-200 rounded-md p-4">
              <div class="flex items-center mb-3">
                <label class="ml-3 text-sm font-medium text-gray-700">${
                  niyamType.charAt(0).toUpperCase() + niyamType.slice(1)
                }</label>
              </div>
              <div class="ml-7">
                ${inputHtml}
              </div>
            </div>
          `;
        dynamicOptionsContainer.innerHTML += niyamHtml;
      }
    } else {
      dynamicOptionsContainer.innerHTML =
        '<p class="text-gray-500">Select a form above to see available Niyams.</p>';
    }
    const selectedForm = window.allNiyamForms.filter((form) => {
    // Compare as strings to avoid type issues
    return String(form.id) === String(selectedOption.dataset.formId);
    });
    if(selectedForm.length > 0)
    {
      const submissionNote = document.getElementById("submission-description");
      const submissionNoteSection = document.getElementById("submission-note-section");
      if (selectedForm[0].description && selectedForm[0].description.trim() !== "") {
        submissionNote.innerHTML = selectedForm[0].description;
        submissionNoteSection.style.display = "block";
      } else {
        submissionNote.innerHTML = "";
        submissionNoteSection.style.display = "none";
      }
    }
  });

// Handle "Niyam for myself" vs "Niyam for other" in Fill Niyam section
document
  .querySelectorAll('input[name="submission-user-type"]')
  .forEach((radio) => {
    radio.addEventListener("change", function () {
      const userDetailsSection = document.getElementById(
        "submission-user-details-section"
      );
      const fullNameInput = document.getElementById("submission-full-name");
      const villageInput = document.getElementById("submission-village");
      const cityInput = document.getElementById("submission-city");
      const mobileInput = document.getElementById("submission-mobile-number"); // Main mobile input
      const otherMobileInput = document.getElementById(
        "submission-other-mobile"
      ); // Mobile for 'other'

      // Get required fields from selected form
      const selectedFormOption = document.getElementById("submission-form-name")
        .options[document.getElementById("submission-form-name").selectedIndex];
      const takerDetailsRequired = selectedFormOption
        ? JSON.parse(selectedFormOption.dataset.takerDetailsRequired || "{}")
        : {};

      if (this.value === "other") {
        // For "other", show user details section and make fields editable
        userDetailsSection.classList.remove("hidden");

        // Main mobile input becomes read-only and cleared
        mobileInput.readOnly = true;
        mobileInput.setAttribute("required", "required");

        // Other mobile input becomes editable and required if form demands
        otherMobileInput.readOnly = false;
        if (takerDetailsRequired.mobile)
          otherMobileInput.setAttribute("required", "required");
        else otherMobileInput.removeAttribute("required");

        // Full name, village, city become editable and required if form demands
        fullNameInput.readOnly = false;
        villageInput.readOnly = false;
        cityInput.readOnly = false;
        if (takerDetailsRequired.name)
          fullNameInput.setAttribute("required", "required");
        else fullNameInput.removeAttribute("required");
        if (takerDetailsRequired.village)
          villageInput.setAttribute("required", "required");
        else villageInput.removeAttribute("required");
        // City is always required for 'other'
        cityInput.setAttribute("required", "required");

        // Clear values for manual entry
        fullNameInput.value = "";
        villageInput.value = "";
        cityInput.value = "";
        otherMobileInput.value = "";

        // Enable autocomplete for 'other' fields
        setupAutocomplete(
          fullNameInput,
          document.getElementById("autocomplete-name-suggestions")
        );
        setupAutocomplete(
          otherMobileInput,
          document.getElementById("autocomplete-mobile-suggestions")
        );
      } else {
        // 'self'
        // For "self", show user details section and pre-fill main mobile
        userDetailsSection.classList.remove("hidden"); // Keep visible for 'self'

        // Main mobile input pre-filled and read-only
        mobileInput.readOnly = true;
        mobileInput.setAttribute("required", "required"); // Main mobile is required for self
        if (window.currentUser && window.currentUser.mobile) {
          mobileInput.value = window.currentUser.mobile;
        } else {
          mobileInput.value = ""; // Clear if no current user
        }

        // Other user details fields become read-only and pre-filled if current user exists
        fullNameInput.readOnly = true;
        villageInput.readOnly = true;
        cityInput.readOnly = true;
        otherMobileInput.readOnly = true; // Keep other mobile read-only/disabled for self

        fullNameInput.removeAttribute("required");
        villageInput.removeAttribute("required");
        cityInput.removeAttribute("required");
        otherMobileInput.removeAttribute("required");

        if (window.currentUser) {
          fullNameInput.value = window.currentUser.full_name || "";
          otherMobileInput.value = window.currentUser.mobile || "";
          villageInput.value = window.currentUser.village || "";
          cityInput.value = window.currentUser.city || "";
        } else {
          fullNameInput.value = "";
          villageInput.value = "";
          cityInput.value = "";
        }

        // Disable autocomplete for 'self' fields
        document.getElementById("autocomplete-name-suggestions").innerHTML = "";
        document.getElementById("autocomplete-mobile-suggestions").innerHTML =
          "";
      }
    });
  });

// Autocomplete for submission-full-name and submission-other-mobile
let autocompleteTimeout;

function setupAutocomplete(inputElement, suggestionsContainer) {
  inputElement.addEventListener("input", function () {
    clearTimeout(autocompleteTimeout);
    const query = this.value.trim();
    suggestionsContainer.innerHTML = ""; // Clear previous suggestions

    // Only perform autocomplete if the input is not readOnly
    if (inputElement.readOnly) {
      return;
    }

    if (query.length < 2) {
      // Start searching after 2 characters
      return;
    }

    autocompleteTimeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/search?query=${query}`
        );
        if (!response.ok) throw new Error("Failed to fetch suggestions");
        const users = await response.json();

        if (users.length > 0) {
          users.forEach((user) => {
            const item = document.createElement("div");
            item.classList.add(
              "autocomplete-suggestion-item",
              "px-3",
              "py-2",
              "hover:bg-gray-100",
              "cursor-pointer"
            );
            item.textContent = `${user.full_name} (${user.mobile}) - ${user.village}, ${user.city}`;
            item.dataset.mobile = user.mobile;
            item.dataset.fullName = user.full_name;
            item.dataset.village = user.village;
            item.dataset.city = user.city;

            item.addEventListener("click", () => {
              document.getElementById("submission-full-name").value =
                user.full_name;
              document.getElementById("submission-other-mobile").value =
                user.mobile;
              document.getElementById("submission-village").value =
                user.village;
              document.getElementById("submission-city").value = user.city;
              suggestionsContainer.innerHTML = ""; // Clear suggestions after selection
            });
            suggestionsContainer.appendChild(item);
          });
        } else {
          suggestionsContainer.innerHTML =
            '<div class="px-3 py-2 text-gray-500">No suggestions found.</div>';
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
        suggestionsContainer.innerHTML =
          '<div class="px-3 py-2 text-red-500">Error fetching suggestions.</div>';
      }
    }, 300); // Debounce for 300ms
  });

  // Hide suggestions when clicking outside
  document.addEventListener("click", function (e) {
    if (
      !inputElement.contains(e.target) &&
      !suggestionsContainer.contains(e.target)
    ) {
      suggestionsContainer.innerHTML = "";
    }
  });
}

// Initialize autocomplete for 'other' user details (only when 'other' is selected)
// This will be called dynamically by the radio button change listener now.
// The initial call on DOMContentLoaded is removed as it's now handled by initializeFillNiyamFormState
// and the radio button change listener.

// Handle Niyam Submission Form (fill-niyam section)
document
  .getElementById("niyam-submission-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const formName = document.getElementById("submission-form-name").value;
    const userType = document.querySelector(
      'input[name="submission-user-type"]:checked'
    ).value;
    const description = document.getElementById("submission-description").value;

    let mobile; // Participant's mobile
    let fullName; // Participant's full name
    let village; // Participant's village
    let city; // Participant's city
    let niyamGiveByName; // Name of the person who filled the form
    let niyamGiveByNumber; // Mobile of the person who filled the form

    // Get the selected form's configuration for required fields
    const selectedFormOption = document.getElementById("submission-form-name")
      .options[document.getElementById("submission-form-name").selectedIndex];
    const takerDetailsRequired = selectedFormOption
      ? JSON.parse(selectedFormOption.dataset.takerDetailsRequired || "{}")
      : {};

    if (userType === "self") {
      // For 'self', use the current logged-in user's details for participant and giver
      if (window.currentUser) {
        mobile = window.currentUser.mobile;
        fullName = window.currentUser.full_name;
        village = window.currentUser.village;
        city = window.currentUser.city;
        niyamGiveByName = "Self"; // Set to 'Self'
        niyamGiveByNumber = "Self"; // Set to 'Self'
      } else {
        showCustomAlert(
          'Error: User data not found for "myself" submission. Please log in.'
        );
        return;
      }
    } else {
      // userType === 'other'
      // For 'other', use the details entered in the form for participant
      mobile = document.getElementById("submission-other-mobile").value;
      fullName = document.getElementById("submission-full-name").value;
      village = document.getElementById("submission-village").value;
      city = document.getElementById("submission-city").value;

      // The giver is the logged-in user
      niyamGiveByName = window.currentUser
        ? window.currentUser.full_name
        : "Guest";
      niyamGiveByNumber = window.currentUser
        ? window.currentUser.mobile
        : "N/A"; // Or a placeholder if not logged in

      // Validate required fields for 'other'
      if (takerDetailsRequired.name && fullName.trim() === "") {
        showCustomAlert(
          "Full Name is required for this Niyam when submitting for others."
        );
        return;
      }
      if (takerDetailsRequired.village && village.trim() === "") {
        showCustomAlert(
          "Village is required for this Niyam when submitting for others."
        );
        return;
      }
      if (
        takerDetailsRequired.mobile &&
        document.getElementById("submission-other-mobile").value.trim() === ""
      ) {
        showCustomAlert(
          "Mobile Number for the other person is required for this Niyam."
        );
        return;
      }
      // City is always required for 'other'
      if (city.trim() === "") {
        showCustomAlert("City is required when submitting for others.");
        return;
      }
    }

    // Collect dynamic Niyam options
    const niyams = {};
    const formOptions = JSON.parse(
      selectedFormOption.dataset.formOptions || "{}"
    );

    for (const niyamType in formOptions) {
      const fieldConfig = formOptions[niyamType];
      const inputName = `niyam-${niyamType}`;

      if (fieldConfig.type === "checkbox") {
        const selectedCheckboxes = Array.from(
          document.querySelectorAll(`input[name="${inputName}"]:checked`)
        ).map((input) => input.value);
        if (selectedCheckboxes.length > 0) {
          niyams[niyamType] = selectedCheckboxes;
        }
      } else if (fieldConfig.type === "radio") {
        const selectedRadio = document.querySelector(
          `input[name="${inputName}"]:checked`
        );
        if (selectedRadio) {
          niyams[niyamType] = selectedRadio.value;
        }
      } else if (fieldConfig.type === "text" || fieldConfig.type === "number") {
        const inputValue = document
          .querySelector(`input[name="${inputName}"]`)
          .value.trim();
        if (inputValue !== "") {
          niyams[niyamType] = inputValue;
        }
      }
    }

    // Ensure at least one Niyam option is selected/entered if the form has options
    if (
      Object.keys(formOptions).length > 0 &&
      Object.keys(niyams).length === 0
    ) {
      showCustomAlert("Please select or enter at least one Niyam option.");
      return;
    }

    const submissionData = {
      form_id: selectedFormOption.dataset.formId,
      form_name: formName,
      name: fullName, // Participant's name
      mobile: mobile, // Participant's mobile
      village: village,
      city: city,
      niyams: niyams,
      submission_date: new Date().toISOString().slice(0, 10), // Current date

      user_type: userType,
      niyam_give_by_name: niyamGiveByName, // New column

      niyam_give_by_number: niyamGiveByNumber, // New column
      description: description,
      status: "Completed", // Assuming all submissions are completed
    };

    try {
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (response.ok) {
        showCustomAlert(result.message || "Niyam submitted successfully!");
        this.reset(); // Clear the form

        // Populate success page details
        const successSummaryDetails = document.getElementById(
          "success-summary-details"
        );
        if (successSummaryDetails) {
          let niyamsSummaryHtml = Object.entries(niyams)
            .map(([key, value]) => {
              let displayValue = Array.isArray(value)
                ? value.join(", ")
                : value;
              return `<li><strong>${
                key.charAt(0).toUpperCase() + key.slice(1)
              }:</strong> ${displayValue}</li>`;
            })
            .join("");

          successSummaryDetails.innerHTML = `
          <p><strong>Form:</strong> ${formName}</p>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Mobile:</strong> ${mobile}</p>
          <p><strong>Village:</strong> ${village}</p>
          <p><strong>City:</strong> ${city}</p>
          <p><strong>Submitted For:</strong> ${
            userType === "self" ? "Myself" : "Someone else"
          }</p>
          <p><strong>Niyam Given By Name:</strong> ${niyamGiveByName}</p>
          <p><strong>Niyam Given By Number:</strong> ${niyamGiveByNumber}</p>
          ${
            Object.keys(niyams).length > 0
              ? `<p class="mt-2"><strong>Niyams Taken:</strong></p><ul>${niyamsSummaryHtml}</ul>`
              : ""
          }
          ${
            description
              ? `<p class="mt-2"><strong>Notes:</strong> ${description}</p>`
              : ""
          }
        `;
        }

        showSection("success-page"); // Navigate to success page
        fetchSubmissions(); // Reload submissions for admin view
      } else {
        showCustomAlert(
          `Error: ${result.message || "Failed to submit Niyam."}`
        );
      }
    } catch (error) {
      console.error("Error submitting Niyam:", error);
      showCustomAlert(
        "Failed to connect to the server or an unexpected error occurred."
      );
    }
  });

// Handle Public Form Submission (public-form section)
document
  .getElementById("public-niyam-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const publicFormId = urlParams.get("formId");

    if (!publicFormId) {
      showCustomAlert("Error: Public form ID not found in URL.");
      return;
    }

    // Fetch the form details to get its name and options
    let formDetails;
    try {
      const response = await fetch(
        `${API_BASE_URL}/niyam-forms/public/${publicFormId}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          showCustomAlert(
            "Error: This Niyam form does not exist or is no longer active."
          );
          return;
        }
        throw new Error(`Failed to fetch form details: ${response.status}`);
      }
      formDetails = await response.json();
    } catch (error) {
      console.error("Error fetching public form details:", error);
      showCustomAlert(
        "Failed to load public form details. Please try again later."
      );
      return;
    }

    const formName = formDetails.niyam_name;
    const publicMobile = document.getElementById("public-mobile").value;
    const userType = document.querySelector(
      'input[name="user-type"]:checked'
    ).value;
    const publicNote = document.getElementById("public-note").value;

    let name = "";
    let village = "";
    let city = "";
    let niyamGiveByName = "Public User"; // Default for public form
    let niyamGiveByNumber = publicMobile; // For public form, the person filling is the giver

    // Get required fields from the fetched form details
    const takerDetailsRequired = formDetails.taker_details_required || {};

    if (userType === "self") {
      // For 'self' on public form, the user filling is the participant
      // Attempt to find user by mobile number
      try {
        const userResponse = await fetch(
          `${API_BASE_URL}/users/search?query=${publicMobile}`
        );
        if (userResponse.ok) {
          const users = await userResponse.json();
          if (users.length > 0) {
            const user = users[0]; // Take the first matching user
            name = user.full_name;
            village = user.village;
            city = user.city;
          } else {
            // User not found, prompt to fill details or register
            showCustomAlert(
              "Your mobile number is not registered. Please fill in your name, village, and city, or register first."
            );
            document
              .getElementById("user-details-section")
              .classList.remove("hidden");
            // Set required attributes based on form configuration or default to true for 'self' if not found
            if (takerDetailsRequired.name)
              document
                .getElementById("public-full-name")
                .setAttribute("required", "required");
            else
              document
                .getElementById("public-full-name")
                .setAttribute("required", "required");
            if (takerDetailsRequired.village)
              document
                .getElementById("public-village")
                .setAttribute("required", "required");
            else
              document
                .getElementById("public-village")
                .setAttribute("required", "required");
            if (takerDetailsRequired.city)
              document
                .getElementById("public-city")
                .setAttribute("required", "required");
            else
              document
                .getElementById("public-city")
                .setAttribute("required", "required");
            return; // Stop submission until details are provided
          }
        } else if (userResponse.status === 404) {
          // User not found, prompt to fill details or register
          showCustomAlert(
            "Your mobile number is not registered. Please fill in your name, village, and city, or register first."
          );
          document
            .getElementById("user-details-section")
            .classList.remove("hidden");
          // Set required attributes based on form configuration or default to true for 'self' if not found
          if (takerDetailsRequired.name)
            document
              .getElementById("public-full-name")
              .setAttribute("required", "required");
          else
            document
              .getElementById("public-full-name")
              .setAttribute("required", "required");
          if (takerDetailsRequired.village)
            document
              .getElementById("public-village")
              .setAttribute("required", "required");
          else
            document
              .getElementById("public-village")
              .setAttribute("required", "required");
          if (takerDetailsRequired.city)
            document
              .getElementById("public-city")
              .setAttribute("required", "required");
          else
            document
              .getElementById("public-city")
              .setAttribute("required", "required");
          return; // Stop submission until details are provided
        } else {
          throw new Error(
            `User search failed with status: ${userResponse.status}`
          );
        }
      } catch (error) {
        console.error("Error searching user for public form:", error);
        showCustomAlert(
          "An error occurred while checking your mobile number. Please try again."
        );
        return;
      }
    } else {
      // userType === 'other'
      // For 'other' on public form, use the details from the user-details-section
      name = document.getElementById("public-full-name").value;
      village = document.getElementById("public-village").value;
      city = document.getElementById("public-city").value;

      // Validate required fields based on form configuration
      if (takerDetailsRequired.name && name.trim() === "") {
        showCustomAlert(
          "Full Name is required for this Niyam when submitting for others."
        );
        return;
      }
      if (takerDetailsRequired.village && village.trim() === "") {
        showCustomAlert(
          "Village is required for this Niyam when submitting for others."
        );
        return;
      }
      if (takerDetailsRequired.city && city.trim() === "") {
        // City is always required for 'other' on public form
        showCustomAlert("City is required when submitting for others.");
        return;
      }
    }

    // Collect dynamic Niyam options from the public form
    const niyams = {};
    const publicNiyamOptionsContainer = document.getElementById(
      "public-niyam-options-container"
    );

    for (const niyamType in formDetails.options) {
      const fieldConfig = formDetails.options[niyamType];
      const inputName = `public-niyam-${niyamType}`;

      if (fieldConfig.type === "checkbox") {
        const selectedCheckboxes = Array.from(
          publicNiyamOptionsContainer.querySelectorAll(
            `input[name="${inputName}"]:checked`
          )
        ).map((input) => input.value);
        if (selectedCheckboxes.length > 0) {
          niyams[niyamType] = selectedCheckboxes;
        }
      } else if (fieldConfig.type === "radio") {
        const selectedRadio = publicNiyamOptionsContainer.querySelector(
          `input[name="${inputName}"]:checked`
        );
        if (selectedRadio) {
          niyams[niyamType] = selectedRadio.value;
        }
      } else if (fieldConfig.type === "text" || fieldConfig.type === "number") {
        const inputValue = publicNiyamOptionsContainer
          .querySelector(`input[name="${inputName}"]`)
          .value.trim();
        if (inputValue !== "") {
          niyams[niyamType] = inputValue;
        }
      }
    }

    // Ensure at least one Niyam option is selected/entered if the form has options
    if (
      Object.keys(formDetails.options).length > 0 &&
      Object.keys(niyams).length === 0
    ) {
      showCustomAlert("Please select or enter at least one Niyam option.");
      return;
    }

    const submissionData = {
      form_id:formDetails.id,
      form_name: formName,
      name: name,
      mobile: publicMobile, // This is the participant's mobile, not necessarily the submitter's
      village: village,
      city: city,
      niyams: niyams,
      submission_date: new Date().toISOString().slice(0, 10), // Current date
      user_type: userType,
      niyam_give_by_name: niyamGiveByName, // New column
      niyam_give_by_number: niyamGiveByNumber, // New column
      description: publicNote,
      status: "Completed", // Assuming all submissions are completed
    };

    try {
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (response.ok) {
        showCustomAlert(result.message || "Niyam submitted successfully!");
        this.reset(); // Clear the form

        // Populate success page details for public form
        const successSummaryDetails = document.getElementById(
          "success-summary-details"
        );
        if (successSummaryDetails) {
          let niyamsSummaryHtml = Object.entries(niyams)
            .map(([key, value]) => {
              let displayValue = Array.isArray(value)
                ? value.join(", ")
                : value;
              return `<li><strong>${
                key.charAt(0).toUpperCase() + key.slice(1)
              }:</strong> ${displayValue}</li>`;
            })
            .join("");

          successSummaryDetails.innerHTML = `
          <p><strong>Form:</strong> ${formName}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Mobile:</strong> ${publicMobile}</p>
          <p><strong>Village:</strong> ${village}</p>
          <p><strong>City:</strong> ${city}</p>
          <p><strong>Submitted For:</strong> ${
            userType === "self" ? "Myself" : "Someone else"
          }</p>
          <p><strong>Niyam Given By Name:</strong> ${niyamGiveByName}</p>
          <p><strong>Niyam Given By Number:</strong> ${niyamGiveByNumber}</p>
          ${
            Object.keys(niyams).length > 0
              ? `<p class="mt-2"><strong>Niyams Taken:</strong></p><ul>${niyamsSummaryHtml}</ul>`
              : ""
          }
          ${
            publicNote
              ? `<p class="mt-2"><strong>Notes:</strong> ${publicNote}</p>`
              : ""
          }
        `;
        }

        showSection("success-page"); // Navigate to success page
        // No need to fetch submissions for admin view from public form
      } else {
        showCustomAlert(
          `Error: ${result.message || "Failed to submit Niyam."}`
        );
      }
    } catch (error) {
      console.error("Error submitting Niyam:", error);
      showCustomAlert(
        "Failed to connect to the server or an unexpected error occurred."
      );
    }
  });

// Handle "For myself" vs "For someone else" radio buttons on public form
document.querySelectorAll('input[name="user-type"]').forEach((radio) => {
  radio.addEventListener("change", function () {
    const userDetailsSection = document.getElementById("user-details-section");
    const publicFullNameInput = document.getElementById("public-full-name");
    const publicVillageInput = document.getElementById("public-village");
    const publicCityInput = document.getElementById("public-city");
    const publicMobileInput = document.getElementById("public-mobile"); // The main mobile input on the public form

    if (this.value === "other") {
      userDetailsSection.classList.remove("hidden");
      publicFullNameInput.setAttribute("required", "required");
      publicVillageInput.setAttribute("required", "required");
      publicCityInput.setAttribute("required", "required");
      publicFullNameInput.value = ""; // Clear for new entry
      publicVillageInput.value = "";
      publicCityInput.value = "";
      publicMobileInput.removeAttribute("required"); // Mobile is for the *other* person, not necessarily the submitter
    } else {
      // 'self'
      userDetailsSection.classList.add("hidden");
      publicFullNameInput.removeAttribute("required");
      publicVillageInput.removeAttribute("required");
      publicCityInput.removeAttribute("required");
      publicFullNameInput.value = ""; // Clear fields
      publicVillageInput.value = "";
      publicCityInput.value = "";
      publicMobileInput.setAttribute("required", "required"); // Mobile is for self, so it's required
    }
  });
});

// Function to load public form details when accessed via URL
async function loadPublicForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const formId = urlParams.get("formId");
  const publicFormSection = document.getElementById("public-form");
  const publicFormTitle = document.getElementById("public-form-title");
  const publicNote = document.getElementById("public-note");
  const publicFormDescription = document.getElementById(
    "public-form-description"
  );
  const publicNiyamOptionsContainer = document.getElementById(
    "public-niyam-options-container"
  );

  if (formId && publicFormSection) {
    showSection("public-form"); // Show the public form section

    // Hide the main sidebar from appearing
    document.getElementById("sidebar").style.display = "none";

    // Hide the mobile-specific header (with the hamburger menu)
    const mobileHeader = document.querySelector(
      ".md\\:hidden.flex.items-center.bg-white"
    );
    if (mobileHeader) {
      mobileHeader.style.display = "none";
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/niyam-forms/public/${formId}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          publicFormTitle.textContent = "Form Not Found";
          publicFormDescription.textContent =
            "The requested Niyam form does not exist or is no longer active.";
          publicNiyamOptionsContainer.innerHTML =
            '<p class="text-red-500">This form is unavailable.</p>';
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
      }
      const form = await response.json();
      console.log("Loaded Public Form:", form);


      publicFormTitle.textContent = form.niyam_name;
      publicFormDescription.textContent =
        form.description ||
        "Fill your niyam commitment for this special occasion";

      // Handle public-note display
      const publicNoteSection = document.getElementById("public-note-section");
      const publicNote = document.getElementById("public-note");
      if (form.description && form.description.trim() !== "") {
        publicNote.innerHTML = form.description;
        publicNoteSection.style.display = "block";
      } else {
        publicNote.innerHTML = "";
        publicNoteSection.style.display = "none";
      }

      publicNiyamOptionsContainer.innerHTML = ""; // Clear existing content

      if (Object.keys(form.options).length === 0) {
        publicNiyamOptionsContainer.innerHTML =
          '<p class="text-gray-500">No specific Niyams defined for this form. You can still submit general details.</p>';
      } else {
        for (const niyamType in form.options) {
          const fieldConfig = form.options[niyamType];
          const options = fieldConfig.options;
          const type = fieldConfig.type; // 'checkbox', 'radio', 'text', 'number'

          let inputHtml = "";
          if (type === "checkbox") {
            inputHtml = options
              .map(
                (optionValue) => `
                  <label class="inline-flex items-center">
                    <input type="checkbox" name="public-niyam-${niyamType}" value="${optionValue}"
                      class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    <span class="ml-2 text-sm">${optionValue}</span>
                  </label>
                `
              )
              .join("");
          } else if (type === "radio") {
            inputHtml = options
              .map(
                (optionValue) => `
                  <label class="inline-flex items-center">
                    <input type="radio" name="public-niyam-${niyamType}" value="${optionValue}"
                      class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                    <span class="ml-2 text-sm">${optionValue}</span>
                  </label>
                `
              )
              .join("");
          } else if (type === "text") {
            inputHtml = `<input type="text" name="public-niyam-${niyamType}" placeholder="Enter ${niyamType}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">`;
          } else if (type === "number") {
            inputHtml = `<input type="number" name="public-niyam-${niyamType}" placeholder="Enter ${niyamType} count"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">`;
          }

          const niyamHtml = `
            <div class="border border-gray-200 rounded-md p-4">
              <div class="flex items-center mb-3">
                <label class="ml-3 text-sm font-medium text-gray-700">${
                  niyamType.charAt(0).toUpperCase() + niyamType.slice(1)
                }:</label>
              </div>
              <div class="ml-7 space-x-2">
                ${inputHtml}
              </div>
            </div>
          `;
          publicNiyamOptionsContainer.innerHTML += niyamHtml;
        }
      }

      // Adjust required attributes for user details based on form configuration
      const userDetailsSection = document.getElementById(
        "user-details-section"
      );
      const publicFullNameInput = document.getElementById("public-full-name");
      const publicVillageInput = document.getElementById("public-village");
      const publicCityInput = document.getElementById("public-city");
      const publicMobileInput = document.getElementById("public-mobile");

      // Default to "self" and adjust visibility/required based on form config
      document.querySelector(
        'input[name="user-type"][value="self"]'
      ).checked = true;
      userDetailsSection.classList.add("hidden"); // Hide by default for 'self'

      // Set required attributes based on form configuration for the public form's inputs
      if (form.taker_details_required?.name) {
        publicFullNameInput.setAttribute("required", "required");
      } else {
        publicFullNameInput.removeAttribute("required");
      }
      if (form.taker_details_required?.village) {
        publicVillageInput.setAttribute("required", "required");
      } else {
        publicVillageInput.removeAttribute("required");
      }
      if (form.taker_details_required?.city) {
        // Assuming a city requirement might exist in the future
        publicCityInput.setAttribute("required", "required");
      } else {
        publicCityInput.removeAttribute("required");
      }
      if (form.taker_details_required?.mobile) {
        // This is for the participant's mobile
        publicMobileInput.setAttribute("required", "required");
      } else {
        publicMobileInput.removeAttribute("required");
      }

      // Trigger change on user-type radio to apply initial state correctly
      document
        .querySelector('input[name="user-type"][value="self"]')
        .dispatchEvent(new Event("change"));
    } catch (error) {
      console.error("Error loading public form:", error);
      publicFormTitle.textContent = "Error Loading Form";
      publicFormDescription.textContent =
        "An error occurred while loading the form. Please try again later.";
      publicNiyamOptionsContainer.innerHTML =
        '<p class="text-red-500">Error loading form data.</p>';
    }
  } else if (window.location.hash === "#public-form") {
    // If navigated directly to #public-form without formId, show a message
    publicFormTitle.textContent = "Select a Public Form";
    publicFormDescription.textContent =
      "Please use a specific link to a Niyam form to fill it out.";
    publicNiyamOptionsContainer.innerHTML =
      '<p class="text-gray-500">No form selected. Navigate from a public link.</p>';
  }
}

// Check URL parameters on load to see if a public form needs to be loaded

window.addEventListener("load", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("formId")) {
    // This is a public form link, bypass login and load the form
    userAuthSection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    loadPublicForm();
  } else {
    // This is a normal entry, proceed with login/session check
    handleInitialLoad();
  }
});
// Function to display My Niyams (self or other)
async function showMyNiyams(type) {
  showSection("my-niyams");
  const myNiyamsTitle = document.getElementById("my-niyams-title");
  const myNiyamsSubtitle = document.getElementById("my-niyams-subtitle");
  const mobileSearchInput = document.getElementById("mobile-search");
  const myNiyamsList = document.getElementById("my-niyams-list");
  const selfRadio = document.querySelector(
    'input[name="my-niyams-user-type"][value="self"]'
  );
  const otherRadio = document.querySelector(
    'input[name="my-niyams-user-type"][value="other"]'
  );

  myNiyamsList.innerHTML =
    '<li><div class="px-6 py-4 text-center text-gray-500">Loading your niyams...</div></li>';
  updateMyNiyamsSummary(0, 0, 0, 0); // Reset summary

  if (type === "self") {
    myNiyamsTitle.textContent = "My Niyams";
    myNiyamsSubtitle.textContent = "View your personal commitments.";
    selfRadio.checked = true;
    mobileSearchInput.value = window.currentUser
      ? window.currentUser.mobile
      : "";
    mobileSearchInput.readOnly = true;
    selfRadio.dispatchEvent(new Event("change")); // <-- Add this line
    document.getElementById("search-my-niyams").click(); // Trigger search
  } else {
    // type === 'other'
    myNiyamsTitle.textContent = "My Submitted Niyams";
    myNiyamsSubtitle.textContent = "See niyams you filled for others.";
    otherRadio.checked = true;
    mobileSearchInput.value = "";
    mobileSearchInput.readOnly = false;
    otherRadio.dispatchEvent(new Event("change")); // <-- Add this line
    myNiyamsList.innerHTML =
      '<li><div class="px-6 py-4 text-center text-green-500">Enter mobile number and click search to view niyams submitted for others.</div></li>';
  }
}
window.showMyNiyams = showMyNiyams; // Make globally accessible

// Event listener for My Niyams radio buttons
document
  .querySelectorAll('input[name="my-niyams-user-type"]')
  .forEach((radio) => {
    radio.addEventListener("change", function () {
      const mobileSearchInput = document.getElementById("mobile-search");
      const mobileSearchContainer = document.getElementById(
        "mobile-search-container"
      );
      const myNiyamsList = document.getElementById("my-niyams-list");
      const searchBtn = document.getElementById("search-my-niyams");

      if (this.value === "self") {
        // Always set mobile to current user before search
        mobileSearchInput.value = window.currentUser
          ? window.currentUser.mobile
          : "";
        mobileSearchInput.readOnly = true;
        mobileSearchContainer.style.display = "none";
        searchBtn.style.display = "none"; // Hide search button for 'self'
        document.getElementById("search-my-niyams").click(); // Trigger search
      } else {
        // 'other'
        mobileSearchContainer.style.display = "";
        mobileSearchInput.value = "";
        mobileSearchInput.readOnly = false;
        searchBtn.style.display = ""; // Show search button for 'other'
        myNiyamsList.innerHTML =
          '<li><div class="px-6 py-4 text-center text-green-500">Enter mobile number and click search to view niyams submitted for others.</div></li>';
      }
    });
  });

// On page load, set initial state
window.addEventListener("DOMContentLoaded", function () {
  const selfRadio = document.querySelector(
    'input[name="my-niyams-user-type"][value="self"]'
  );
  if (selfRadio && selfRadio.checked) {
    document.getElementById("mobile-search-container").style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  window.quill = new Quill("#description-editor", {
    theme: "snow",
    modules: {
      toolbar: [
        ["bold", "italic", "underline"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
      ],
    },
  });
});

// Function to fetch and display user's Niyams
document
  .getElementById("search-my-niyams")
  .addEventListener("click", async function () {
    const mobileNumber = document.getElementById("mobile-search").value.trim();
    const userType = document.querySelector(
      'input[name="my-niyams-user-type"]:checked'
    ).value;
    const myNiyamsList = document.getElementById("my-niyams-list");

    if (!mobileNumber) {
      showCustomAlert("Please enter a mobile number to search.");
      myNiyamsList.innerHTML =
        '<li><div class="px-6 py-4 text-center text-gray-500">Please enter a mobile number to search.</div></li>';
      updateMyNiyamsSummary(0, 0, 0, 0);
      return;
    }

    myNiyamsList.innerHTML =
      '<li><div class="px-6 py-4 text-center text-gray-500">Searching for niyams...</div></li>';
    updateMyNiyamsSummary(0, 0, 0, 0);

    try {
      let url = `${API_BASE_URL}/submissions`;
      let Submissions = [];
      let niyamsThisMonth = 0;
      let inprogressNiyams = 0;

      if (userType === "self") {
        const response = await fetch(`${url}?mobile=${mobileNumber}`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        Submissions = await response.json();
        Submissions = Submissions.filter((s) => s.user_type === "self");
      } else {
        // userType === 'other'
        if (!window.currentUser || !window.currentUser.mobile) {
          showCustomAlert("Please login to view Niyams submitted for others.");
          myNiyamsList.innerHTML =
            '<li><div class="px-6 py-4 text-center text-gray-500">Please login to view Niyams submitted for others.</div></li>';
          return;
        }
        const response = await fetch(
          `${url}?submittedbynumber=${mobileNumber}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        Submissions = await response.json();
        Submissions = Submissions.filter(
          (s) => s.user_type === "other" && s.mobile === mobileNumber
        );
      }

      console.log("My Niyams Submissions:", Submissions);

      myNiyamsList.innerHTML = "";

      if (Submissions.length === 0) {
        myNiyamsList.innerHTML =
          '<li><div class="px-6 py-4 text-center text-red-500">No Niyams found for this mobile number.</div></li>';
        updateMyNiyamsSummary(0, 0, 0, 0);
      } else {
        let totalNiyams = 0;
        let completedNiyams = 0;
        let pendingNiyams = 0;
        let failedNiyams = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        Submissions.forEach((submission) => {
          totalNiyams++;
          completedNiyams++; // Assuming all fetched submissions are completed

          const submissionDate = new Date(submission.submission_date);
          if (
            submissionDate.getMonth() === currentMonth &&
            submissionDate.getFullYear() === currentYear
          ) {
            niyamsThisMonth++;
          }

          const niyamsText = Object.entries(submission.niyams)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${
                  key.charAt(0).toUpperCase() + key.slice(1)
                }: ${value.join(", ")}`;
              }
              return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
            })
            .join(", ");

          const listItem = `
        <li>
            <div class="block hover:bg-gray-50 px-6 py-4">
                <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-600 truncate">${
                  submission.form_name
                }</p>
                <div class="ml-2 flex-shrink-0 flex">
                <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Completed
                </p>
                </div>
                </div>
                <div class="mt-2 sm:flex sm:justify-between">
                <div class="sm:flex">
                    <p class="flex items-center text-sm text-gray-500">
                    <i class="fas fa-user-circle mr-1"></i> ${submission.name}
                    </p>
                    <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                    <i class="fas fa-mobile-alt mr-1"></i> ${submission.mobile}
                    </p>
                    </div>
                    <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <i class="fas fa-calendar-alt mr-1"></i> Submitted on ${formatDate(
                      submission.submission_date
                    )}
                    </div>
                </div>
                <div class="mt-2 text-sm text-gray-700">
                <strong>Niyams:</strong> ${niyamsText}
                </div>
                ${
                  submission.description
                    ? `<div class="mt-1 text-sm text-gray-600 italic">Notes: ${submission.description}</div>`
                    : ""
                }
                <div class="mt-1 text-sm text-gray-600">
                <strong>Given By:</strong> ${
                  submission.niyam_give_by_name || "N/A"
                } (${submission.niyam_give_by_number || "N/A"})
                </div>
            </div>
            </li>
        `;
          myNiyamsList.innerHTML += listItem;
        });
        updateMyNiyamsSummary(
          totalNiyams,
          niyamsThisMonth,
          completedNiyams,
          inprogressNiyams
        );
      }
    } catch (error) {
      console.error("Error fetching my Niyams:", error);
      showCustomAlert(
        "Failed to load your niyams. Please check backend server."
      );
      myNiyamsList.innerHTML =
        '<li><div class="px-6 py-4 text-center text-red-500">Error loading your niyams. Please try again later.</div></li>';
      updateMyNiyamsSummary(0, 0, 0, 0);
    }
  });

function updateMyNiyamsSummary(total, thisMonth, completed, inProgress) {
  document.getElementById("my-niyams-total").textContent = total;
  document.getElementById("my-niyams-this-month").textContent = thisMonth;
  // If you have these elements, uncomment below:
  // document.getElementById('my-niyams-completed').textContent = completed;
  // document.getElementById('my-niyams-in-progress').textContent = inProgress;
}

// Utility function to populate Fill Niyam Forms dropdown
// function populateFillNiyamFormsDropdown(forms) {
//   const dropdown = document.getElementById("submission-form-name");
//   dropdown.innerHTML = '<option value="">નિયમ પસંદ કરો</option>';
//   forms.forEach((niyamForm) => {
//     // Use niyamForm, not form
//     dropdown.innerHTML += `<option value="${niyamForm.id}">${niyamForm.niyam_name}</option>`;
//   });
// }
