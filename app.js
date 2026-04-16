import { ARButton } from 'https://unpkg.com/three@0.128.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // הוספת כפתור ה-AR
    const button = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
    document.body.appendChild(button);

    // יצירת ה-Reticle (העיגול שמוצא רצפה)
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x39FF14 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // לחיצה על המסך יוצרת חץ ירוק על הרצפה
    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', spawnArrow);
    scene.add(controller);

    window.addEventListener('resize', onWindowResize);
}

function spawnArrow() {
    if (reticle.visible) {
        // יצירת צורת חץ (כמו בתמונה ששלחת)
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.2);
        shape.lineTo(0.15, 0);
        shape.lineTo(0.07, 0);
        shape.lineTo(0.07, -0.3);
        shape.lineTo(-0.07, -0.3);
        shape.lineTo(-0.07, 0);
        shape.lineTo(-0.15, 0);
        shape.lineTo(0, 0.2);

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({ color: 0x39FF14, side: THREE.DoubleSide });
        const arrow = new THREE.Mesh(geometry, material);

        // הצבת החץ במיקום הרצפה שזוהה
        arrow.position.setFromMatrixPosition(reticle.matrix);
        arrow.quaternion.setFromMatrixRotation(reticle.matrix);
        arrow.rotateX(-Math.PI / 2); // משכיב על הרצפה
        
        scene.add(arrow);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            session.hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                document.getElementById('status-indicator').innerText = "רצפה זוהתה! לחץ להוספת חץ";
            } else {
                reticle.visible = false;
                document.getElementById('status-indicator').innerText = "מחפש רצפה...";
            }
        }
    }
    renderer.render(scene, camera);
}