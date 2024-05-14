document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');

  // Optionally, you can also load the 'sent' mailbox when the compose form is submitted
  const form = document.querySelector('#compose-form');
  form.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission
    send_mail();
    load_mailbox('sent');
  });
});


function compose_email() {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-detail').style.display = 'none';

  // Clear email-list content
  document.querySelector('#email-list').innerHTML = '';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

}


function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-detail').style.display = 'none'; // Hide the email detail view

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Fetch emails for the selected mailbox
  const url = `/emails/${mailbox}`;
  fetch(url)
    .then(response => response.json())
    .then(emails => {
      // Clear existing content
      document.querySelector('#email-list').innerHTML = '';

      // Iterate through each email and display them
      emails.forEach(email => {
        const emailItem = document.createElement('div');
        emailItem.classList.add('card', 'mb-2');

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const sender = document.createElement('h5');
        sender.classList.add('card-title', 'text-muted');
        sender.textContent = email.sender;

        const subject = document.createElement('p');
        subject.classList.add('card-subtitle', 'mb-2');
        subject.textContent = email.subject;

        const timestamp = document.createElement('h6');
        timestamp.classList.add('card-text', 'text-muted');
        timestamp.textContent = email.timestamp;

        // Set background color based on read status
        if (email.read) {
          emailItem.classList.add('bg-light');
        } else {
          emailItem.classList.add('bg-white');
        }

        cardBody.appendChild(sender);
        cardBody.appendChild(subject);
        cardBody.appendChild(timestamp);

        emailItem.appendChild(cardBody);

        // Append archive/unarchive button if the mailbox is not "sent"
        if (mailbox !== 'sent') {
          const archiveBtn = document.createElement('button');
          archiveBtn.textContent = email.archived ? 'Unarchive' : 'Archive';
          archiveBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'mr-2');
          archiveBtn.addEventListener('click', (event) => {
            event.stopPropagation()
            fetch(`emails/${email.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                archived: !email.archived // Toggle archived status
              })
            })
            load_mailbox('inbox')
          });
          cardBody.appendChild(archiveBtn);
        }

        // Handle click event on email card
        emailItem.addEventListener('click', () => {
          fetch(`emails/${email.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              read: true
            })
          });
          email_detail(email.id);
        });

        document.querySelector('#email-list').appendChild(emailItem);
      });
    });
}


function email_detail(email_id) {
  // Hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-list').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-detail').style.display = 'block'; // Show the email detail view


  // Fetch the email by its ID
  const url = `/emails/${email_id}`;
  fetch(url)
    .then(response => response.json())
    .then(email => {
      // Clear existing content
      document.querySelector('#email-detail').innerHTML = '';

      // Create Bootstrap card for the email
      const emailItem = document.createElement('div');
      emailItem.classList.add('card', 'mb-3');

      const cardBody = document.createElement('div');
      cardBody.classList.add('card-body');

      const sender = document.createElement('h5');
      sender.classList.add('card-title');
      sender.textContent = `From: ${email.sender}`;

      const recipients = document.createElement('p');
      recipients.classList.add('card-text', 'mb-1');
      recipients.textContent = email.recipients ? `To: ${email.recipients.join(', ')}` : ''; // Check if recipients exist before accessing

      const subject = document.createElement('h6');
      subject.classList.add('card-subtitle', 'mb-2', 'text-muted');
      subject.textContent = `Subject: ${email.subject}`;

      const timestamp = document.createElement('p');
      timestamp.classList.add('card-text', 'text-muted');
      timestamp.textContent = `Timestamp: ${email.timestamp}`;

      const body = document.createElement('p');
      body.classList.add('card-text', 'mt-5');
      body.textContent = email.body;

      // Create reply button
      const replyButton = document.createElement('button');
      replyButton.textContent = 'Reply';
      replyButton.classList.add('btn', 'btn-sm', 'btn-primary', 'mr-2');
      replyButton.addEventListener('click', () => {
        reply_email(email.sender, email.subject, email.timestamp, email.body);
      });


      // Prefill compose form fields
      document.querySelector('#compose-recipients').value = email.sender; // Set sender as recipient
      document.querySelector('#compose-subject').value = `Re: ${email.subject}`; // Add 'Re: ' prefix to subject

      // Append elements to card body
      cardBody.appendChild(sender);
      cardBody.appendChild(recipients);
      cardBody.appendChild(subject);
      cardBody.appendChild(timestamp);
      cardBody.appendChild(replyButton); // Append reply button
      cardBody.appendChild(body);
      

      
      // Append card body to card
      emailItem.appendChild(cardBody);

      // Append card to email detail view
      document.querySelector('#email-detail').appendChild(emailItem);
    })
    .catch(error => {
      console.error('Error fetching email:', error);
      // Optionally display an error message
      const errorMessage = document.createElement('p');
      errorMessage.textContent = 'Failed to load email details. Please try again later.';
      document.querySelector('#email-detail').appendChild(errorMessage);
    });
}


function send_mail() {
  // Get the values of the items to be posted
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Use fetch to make a post request
  fetch('/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' // Set Content-Type header
    },
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    })
  })
  .then(response => response.json())
  .then(result => {
    // Print result
    console.log(result);
  });
}

function reply_email(recipient, subject, originalTimestamp, originalBody) {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-detail').style.display = 'none';


  // Pre-fill composition fields
  document.querySelector('#compose-recipients').value = recipient;
  document.querySelector('#compose-subject').value = subject.startsWith('Re: ') ? subject : `Re: ${subject}`;
  
  // Format original email timestamp
  const formattedTimestamp = new Date(originalTimestamp).toLocaleString();

  // Pre-fill the body of the email
  const originalEmailBody = `"On ${formattedTimestamp}, ${recipient} wrote:"\n${originalBody}`;

  document.querySelector('#compose-body').value = originalEmailBody;
}