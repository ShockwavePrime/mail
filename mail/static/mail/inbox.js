document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  // By default, load the inbox
  load_mailbox("inbox");

  document.querySelector("#compose-form").onsubmit = function (event) {
    event.preventDefault();
    send_mail();
  };
});

function compose_email() {
  // Show compose view and hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  // Clear out composition fields
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";
}

function load_mailbox(mailbox) {
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-content-view").style.display = "none";

  const emailsView = document.querySelector("#emails-view");
  emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      if (Array.isArray(emails)) {
        emails.forEach((email) => {
          const emailDiv = document.createElement("div");
          emailDiv.className = "email-summary";
          emailDiv.style.border = "1px solid lightgray";
          emailDiv.style.padding = "10px";
          emailDiv.style.margin = "5px";
          emailDiv.style.cursor = "pointer";
          emailDiv.style.backgroundColor = email.read ? "#f0f0f0" : "white";

          emailDiv.innerHTML = `
            <strong>${email.sender}</strong> - ${email.subject}
            <span style="float:right;">${email.timestamp}</span>
          `;
          emailDiv.addEventListener("click", () => load_email(email.id));
          emailsView.appendChild(emailDiv);
        });
      } else if ("error" in emails) {
        emailsView.innerHTML += `<p>${emails.error}</p>`;
      }
    });
}

function load_email(email_id) {
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-content-view").style.display = "block";
  fetch(`/emails/${email_id}`, {
    method: "GET",
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.error) {
        // Handle error
        document.querySelector("#email-content-view").innerHTML =
          `<p>${result.error}</p>`;
        return;
      }
      fetch(`/emails/${email_id}`, {
        method: "PUT",
        body: JSON.stringify({
          read: true,
        }),
      });
      document.querySelector("#email-content-view").innerHTML = `
      <h3>${result.subject}</h3>
      <strong>From:</strong> ${result.sender}<br>
      <strong>To:</strong> ${result.recipients.join(", ")}<br>
      <strong>Timestamp:</strong> ${result.timestamp}
      <hr>
      <p>${result.body}</p>
      `;

      // Archive/Unarchive button
      const userEmail = document.querySelector("h2").innerText;
      if (result.sender !== userEmail) {
        const archiveButton = document.createElement("button");
        archiveButton.innerText = result.archived ? "Unarchive" : "Archive";
        archiveButton.className = "btn btn-sm btn-outline-secondary";
        archiveButton.addEventListener("click", () => {
          fetch(`/emails/${result.id}`, {
            method: "PUT",
            body: JSON.stringify({
              archived: !result.archived,
            }),
          }).then(() => load_mailbox("inbox"));
        });
        document
          .querySelector("#email-content-view")
          .appendChild(archiveButton);
      }

      // Reply button
      const replyButton = document.createElement("button");
      replyButton.innerText = "Reply";
      replyButton.className = "btn btn-sm btn-primary ml-2";
      replyButton.addEventListener("click", () => {
        compose_email();

        document.querySelector("#compose-recipients").value = result.sender;
        const subject = result.subject.startsWith("Re:")
          ? result.subject
          : `Re: ${result.subject}`;
        document.querySelector("#compose-subject").value = subject;
        document.querySelector("#compose-body").value =
          `\n\nOn ${result.timestamp} ${result.sender} wrote:\n${result.body}`;
      });
      document.querySelector("#email-content-view").appendChild(replyButton);
    });
}

function send_mail() {
  fetch("/emails", {
    method: "POST",
    body: JSON.stringify({
      recipients: document.querySelector("#compose-recipients").value,
      subject: document.querySelector("#compose-subject").value,
      body: document.querySelector("#compose-body").value,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      const statusMessage = document.querySelector("#status-message");
      if ("message" in result) {
        statusMessage.innerHTML = result.message;
        statusMessage.style.color = "green";
        document.querySelector("#compose-recipients").value = "";
        document.querySelector("#compose-subject").value = "";
        document.querySelector("#compose-body").value = "";
        setTimeout(() => load_mailbox("sent"), 1000);
      } else if ("error" in result) {
        statusMessage.innerHTML = result.error;
        statusMessage.style.color = "red";
      }
    })
    .catch((error) => {
      console.error("Error sending email:", error);
    });
}

