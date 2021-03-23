import { GlTf } from 'gltf-loader-ts/lib/gltf';
import { GlContext } from './core/gl-context';
import { CompassScene } from './scenes/compass/compass-scene';

import './index.scss';

const eye: number[] = [-10, 10, 10];

const eyeControls: HTMLInputElement[] = [
  document.getElementById('eyeX') as HTMLInputElement,
  document.getElementById('eyeY') as HTMLInputElement,
  document.getElementById('eyeZ') as HTMLInputElement
];
for(let i = 0; i < eye.length; i ++) {
  const eyeControl = eyeControls[i];
  eyeControl.value = eye[i].toString();
  eyeControl.addEventListener('input', (event: Event) => changeCameraPosition(event, i));
}

const eyeValueViews: (HTMLElement | null)[] = [
  document.getElementById('eyeXValue'),
  document.getElementById('eyeYValue'),
  document.getElementById('eyeZValue')
];
for (let i = 0; i < eye.length; i ++) {
  const eyeValueView = eyeValueViews[i];
  if (eyeValueView) {
    eyeValueView.innerHTML = eye[i].toString();
  }
}

const glContext: GlContext = new GlContext('canvas');

if (glContext.gl === null) {
  throw new Error('Gl context hasn\'t been found');
}

const scene = new CompassScene(glContext.gl);

scene.loadModel().then((gltf: GlTf | undefined) => {
  scene.prepareScene();
  scene.drawScene(...eye);
});

function changeCameraPosition(event: Event, axis: number) {
  const target = event.currentTarget as HTMLInputElement;
  eye[axis] = target.valueAsNumber;
  const eyeValueView = eyeValueViews[axis];
  if (eyeValueView) {
    eyeValueView.innerHTML = target.value;
  }
  scene.drawScene(...eye);
}
