const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

//Con archivo JSON
const fs = require('fs');
const path = require('path');
const studentsFilePath = path.join(__dirname, 'students.json');

//Con firebase
const admin = require('firebase-admin');
const serviceAccount = require('./demopp-fb74e-firebase-adminsdk-6scwy-dcdaf747bb.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
//Guardar listado en base de datos firebase
app.post('/api/saveStudents', async (req, res) => {
  const { students, collectionName } = req.body;

  try {
    const chunkSize = 500; // Dividir en fragmentos si es necesario
    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize);
      const batch = admin.firestore().batch();
      chunk.forEach((student) => {
        const studentRef = admin.firestore().collection(collectionName).doc();
        batch.set(studentRef, student);
      });
      await batch.commit();
    }
    res.status(200).send('Students saved successfully');
  } catch (error) {
    console.error('Error saving students: ', error);
    res.status(500).send('Failed to save students');
  }
  });
  
//Obtener estudiantes de la base de datos firebase
app.get('/api/getStudents', async (req, res) => {
    const { collectionName } = req.query;
  
    if (!collectionName) {
      return res.status(400).send('Collection name is required');
    }
  
    try {
      const snapshot = await db.collection(collectionName).get();
      if (snapshot.empty) {
        return res.status(404).send('No students found');
      }
  
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

     // console.log(documents);
      res.status(200).json(documents);
    } catch (error) {
      console.error('Error getting students: ', error);
      res.status(500).send('Failed to get students');
    }
  });
  
//Enviar mail con el certificado
app.post('/send-email', async (req, res) => {
  const { student, pdfData } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail', // o el servicio que uses (ej. Outlook, Yahoo, etc.)
    auth: {
      user: 'certificadosvautpl@gmail.com', // tu correo
      pass: 'qwrg rpfs yyjl qorv' // tu contraseña
    },
    tls: {
        rejectUnauthorized: false
      }
  });

  const mailOptions = {
    from: 'certificadosvautpl@gmail.com',
    to: student.email,
    subject: 'Certificado de Curso',
    text: `Hola ${student.nombre}, adjunto encontrarás tu certificado de curso.`,
    attachments: [
      {
        filename: `Certificado_${student.nombre}.pdf`,
        content: Buffer.from(pdfData, 'base64'),
        encoding: 'base64'
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send('Email enviado correctamente');
  } catch (error) {
    console.error('Error al enviar el email:', error);
    res.status(500).send('Error al enviar el email');
  }
});

// Buscar estudiantes por cedula
app.get('/api/getStudentById/:id', async (req, res) => {
    const studentId = req.params.id;
  
    try {
      const snapshot = await db.collection('students')
        .where('nombre', '==', studentName) // Cambia 'nombre' por el campo correspondiente
        .get();
  
      if (snapshot.empty) {
        res.status(404).send('No students found with this name');
        return;
      }
  
      const students = snapshot.docs.map(doc => doc.data());
      res.status(200).json(students);
    } catch (error) {
      console.error('Error getting students by name: ', error);
      res.status(500).send('Failed to get students');
    }
  });

  //Obtener colleciones
  app.get('/api/getCollections', async (req, res) => {
    try {
      const collections = await admin.firestore().listCollections();
      const collectionNames = collections.map(collection => collection.id);
      res.status(200).json(collectionNames);
    } catch (error) {
      console.error('Error getting collections: ', error);
      res.status(500).send('Failed to get collections');
    }
});

  // Actualizar el campo certificadoEnviado en la base de datos

  app.post('/api/updateStudentStatusBd', async (req, res) => {
    const { documentId, certificadoEnviado, collectionName, fechaEnvio } = req.body;
    //console.log(documentId, certificadoEnviado, collectionName, fechaEnvio);
  if (!documentId || !collectionName) {
    return res.status(400).send('Missing studentId or collectionName');
  }

  try {
    const studentRef = admin.firestore().collection(collectionName).doc(documentId);
    await studentRef.update({ certificadoEnviado: certificadoEnviado, fechaEnvio: fechaEnvio });
    res.status(200).send('Student status updated successfully');
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).send('Failed to update student status');
  }
  });

//Actualizar JSON local
app.post('/api/updateStudentStatus', async (req, res) => {
    const { studentId, certificadoEnviado } = req.body;
  
    try {
      // Leer el archivo JSON
      const data = fs.readFileSync(studentsFilePath, 'utf8');
      const students = JSON.parse(data);
  
      // Buscar el estudiante y actualizar el estado
      const studentIndex = students.findIndex(student => student.id === studentId);
      if (studentIndex !== -1) {
        students[studentIndex].certificadoEnviado = certificadoEnviado;
  
        // Escribir los datos actualizados en el archivo JSON
        fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2), 'utf8');
        res.status(200).send('Student status updated successfully');
      } else {
        res.status(404).send('Student not found');
      }
    } catch (error) {
      console.error('Error updating student status: ', error);
      res.status(500).send('Failed to update student status');
    }
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
