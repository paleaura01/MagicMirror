export default {
    render(container) {
      console.log('HelloWorldModule render function called');
      const element = document.createElement('div');
      element.textContent = 'Hello, Sexy!';
      element.style.fontSize = '3em';
      element.style.textAlign = 'center';
      element.style.color = '#fff';
      container.appendChild(element);
      console.log('Element appended to container:', container);
    }
  };
  