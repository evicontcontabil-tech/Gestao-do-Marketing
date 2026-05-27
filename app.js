/* ================= TOGGLE MOBILE ================= */

const toggleBtn = document.getElementById('toggleMain');
const main = document.querySelector('.main');

toggleBtn.addEventListener('click', () => {

  main.classList.toggle('hidden-mobile');

  if(main.classList.contains('hidden-mobile')){
    toggleBtn.innerHTML = '👁';
  }else{
    toggleBtn.innerHTML = '☰';
  }

});
