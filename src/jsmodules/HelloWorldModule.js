// src/jsmodules/HelloWorldModule.js
export default {
    render(container) {
      const element = document.createElement('div');
      element.textContent = 'Hello, World!';
      element.style.fontSize = '3em';
      element.style.textAlign = 'center';
      element.style.color = '#fff';
      container.appendChild(element);
    }
  };
  