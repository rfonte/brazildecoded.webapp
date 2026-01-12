// Manipulação simples de formulários para protótipo estático
(function(){
  function showMessage(el, msg){
    el.textContent = msg;
  }

  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('leadEmail').value.trim();
      var feedback = document.getElementById('leadFeedback');
      if(!email){ showMessage(feedback, 'Por favor, informe um e-mail válido.'); return; }
      var leads = JSON.parse(localStorage.getItem('brazildecoded_leads')||'[]');
      leads.push({email: email, date: new Date().toISOString()});
      localStorage.setItem('brazildecoded_leads', JSON.stringify(leads));
      showMessage(feedback, 'Obrigado! Seu e-mail foi registrado.');
      leadForm.reset();
    });
  }

  var contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('name').value.trim();
      var email = document.getElementById('email').value.trim();
      var message = document.getElementById('message').value.trim();
      var feedback = document.getElementById('contactFeedback');
      if(!name||!email||!message){ showMessage(feedback,'Preencha todos os campos.'); return; }
      var contacts = JSON.parse(localStorage.getItem('brazildecoded_contacts')||'[]');
      contacts.push({name:name,email:email,message:message,date:new Date().toISOString()});
      localStorage.setItem('brazildecoded_contacts', JSON.stringify(contacts));
      showMessage(feedback,'Mensagem enviada. Obrigado!');
      contactForm.reset();
    });
  }
})();
