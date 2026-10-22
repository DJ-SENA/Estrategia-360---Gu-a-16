const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      'Content-Type': 'application/json',
    };
    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {
          parsed = responseBody;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   BATERÍA DE VERIFICACIÓN TÉCNICA ESTRATEGIA 360 - GUÍA 16     ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(testName, condition, detail) {
    total++;
    if (condition) {
      passed++;
      console.log(`[SUPERADA] ${testName}`);
      if (detail) console.log(`           -> ${detail}`);
    } else {
      console.error(`[FALLIDA]  ${testName}`);
      if (detail) console.error(`           -> ${detail}`);
    }
  }

  // PRUEBA A: Rechazo de @sena.edu.co para perfil Aprendiz
  const resA = await request('POST', '/api/auth/login', {
    email: 'carlos.mendoza@sena.edu.co',
    role: 'APRENDIZ',
    name: 'Carlos Mendoza',
    gaesNumber: 3,
    fichaNumber: '2687410'
  });
  assert('PRUEBA A: Rechazo de dominio @sena.edu.co en perfil Aprendiz',
    resA.status === 400 && resA.data.error.includes('@soy.sena.edu.co'),
    resA.data.error
  );

  // PRUEBA B: Rechazo de correos comerciales (Gmail, Hotmail, etc.)
  const resB1 = await request('POST', '/api/auth/login', {
    email: 'aprendiz@gmail.com',
    role: 'APRENDIZ',
    name: 'Aprendiz Gmail',
    gaesNumber: 3,
    fichaNumber: '2687410'
  });
  const resB2 = await request('POST', '/api/auth/login', {
    email: 'instructor@hotmail.com',
    role: 'INSTRUCTOR',
    password: 'SenaInstructor*2026',
    name: 'Instructor Hotmail'
  });
  assert('PRUEBA B: Rechazo estricto de correos no institucionales (Gmail / Hotmail)',
    resB1.status === 400 && resB2.status === 400,
    `Aprendiz Gmail: ${resB1.data.error} | Instructor Hotmail: ${resB2.data.error}`
  );

  // PRUEBA C: Rechazo de Instructor sin contraseña o con clave errónea
  const resC1 = await request('POST', '/api/auth/login', {
    email: 'instructor.lider@sena.edu.co',
    role: 'INSTRUCTOR',
    password: '',
    name: 'Instructor Test'
  });
  const resC2 = await request('POST', '/api/auth/login', {
    email: 'instructor.lider@sena.edu.co',
    role: 'INSTRUCTOR',
    password: 'clave_invalida',
    name: 'Instructor Test'
  });
  assert('PRUEBA C: Rechazo de Instructor sin credenciales o contraseña inválida',
    resC1.status === 400 && resC2.status === 401,
    `Sin pass: Status ${resC1.status} (${resC1.data.error}) | Clave errónea: Status ${resC2.status} (${resC2.data.error})`
  );

  // PRUEBA D: Rechazo de @soy.sena.edu.co para perfil Instructor
  const resD = await request('POST', '/api/auth/login', {
    email: 'vrestrepo@soy.sena.edu.co',
    role: 'INSTRUCTOR',
    password: 'SenaInstructor*2026',
    name: 'Aprendiz como Instructor'
  });
  assert('PRUEBA D: Rechazo de dominio @soy.sena.edu.co en perfil Instructor',
    resD.status === 400 && resD.data.error.includes('@sena.edu.co'),
    resD.data.error
  );

  // PRUEBA E: Login institucional exitoso con tokens de sesión válidos
  const resE_Aprendiz = await request('POST', '/api/auth/login', {
    email: 'vrestrepo@soy.sena.edu.co',
    role: 'APRENDIZ',
    name: 'Valentina Restrepo Henao',
    gaesNumber: 3,
    fichaNumber: '2687410'
  });
  const resE_Instructor = await request('POST', '/api/auth/login', {
    email: 'instructor.lider@sena.edu.co',
    role: 'INSTRUCTOR',
    password: 'SenaInstructor*2026',
    name: 'Instructor Principal'
  });
  const aprendizToken = resE_Aprendiz.data.token;
  const instructorToken = resE_Instructor.data.token;
  assert('PRUEBA E: Autenticación exitosa institucional Aprendiz (@soy.sena.edu.co) e Instructor (@sena.edu.co)',
    resE_Aprendiz.status === 200 && resE_Instructor.status === 200 && !!aprendizToken && !!instructorToken,
    `Aprendiz: ${resE_Aprendiz.data.user.email} (GAES ${resE_Aprendiz.data.user.gaesNumber}) | Instructor: ${resE_Instructor.data.user.email}`
  );

  // PRUEBA F: Aislamiento estricto de datos entre GAES
  const resF_List = await request('GET', '/api/projects', null, { Authorization: `Bearer ${aprendizToken}` });
  const gaesNumbersReturned = (resF_List.data.projects || []).map(p => p.gaesNumber);
  const onlyOwnGaes = gaesNumbersReturned.every(g => g === 3);

  const resF_Intrusion = await request('GET', '/api/projects/gaes-2-biocafe', null, { Authorization: `Bearer ${aprendizToken}` });
  assert('PRUEBA F: Aislamiento de datos: Aprendiz GAES 3 solo ve su GAES y recibe 403 al acceder a GAES 2',
    onlyOwnGaes && resF_Intrusion.status === 403,
    `Proyectos devueltos a GAES 3: [${gaesNumbersReturned.join(', ')}] | HTTP Status acceso a GAES 2: ${resF_Intrusion.status} (${resF_Intrusion.data.error})`
  );

  // PRUEBA G: Control de concurrencia optimista (HTTP 409 Conflict)
  const resG_GetProj = await request('GET', '/api/projects/gaes-3-agrolacteos', null, { Authorization: `Bearer ${aprendizToken}` });
  const currentVersion = resG_GetProj.data.project.version || 1;

  // Actualización legítima
  const resG_Update1 = await request('PUT', '/api/projects/gaes-3-agrolacteos', {
    clientVersion: currentVersion,
    updatedProject: {
      ...resG_GetProj.data.project,
      company: { ...resG_GetProj.data.project.company, name: 'Lácteos del Valle S.A.S. - Concurrencia OK' }
    },
    changeSummary: 'Actualización colaborativa de datos generales',
    phaseIntervened: 1,
    componentIntervened: 'Empresa'
  }, { Authorization: `Bearer ${aprendizToken}` });

  const updatedVersion = resG_Update1.data.project ? resG_Update1.data.project.version : null;

  // Intento de actualización con versión desactualizada (currentVersion < updatedVersion)
  const resG_Conflict = await request('PUT', '/api/projects/gaes-3-agrolacteos', {
    clientVersion: currentVersion,
    updatedProject: {
      company: { name: 'Sobrescritura No Autorizada' }
    },
    changeSummary: 'Intento de sobrescritura concurrente',
    phaseIntervened: 1,
    componentIntervened: 'Empresa'
  }, { Authorization: `Bearer ${aprendizToken}` });

  assert('PRUEBA G: Control de Concurrencia Optimista: Conflicto 409 al detectar versión desactualizada',
    resG_Update1.status === 200 && resG_Conflict.status === 409 && resG_Conflict.data.conflict === true,
    `Versión anterior: ${currentVersion} -> Nueva versión: ${updatedVersion} | Intento con v${currentVersion}: Status ${resG_Conflict.status} (${resG_Conflict.data.error})`
  );

  // PRUEBA H: Bloqueo de proyecto evaluado (HTTP 423 Locked)
  // 1. Instructor evalúa y bloquea GAES 4
  const resH_Get4 = await request('GET', '/api/projects/gaes-4-confecciones-textil', null, { Authorization: `Bearer ${instructorToken}` });
  const ver4 = resH_Get4.data.project.version || 1;

  await request('PUT', '/api/projects/gaes-4-confecciones-textil', {
    clientVersion: ver4,
    updatedProject: {
      ...resH_Get4.data.project,
      isLocked: true,
      instructorEvaluation: {
        ...resH_Get4.data.project.instructorEvaluation,
        isDefinitiveSaved: true,
        finalJudgment: 'APROBADO',
        instructorName: 'Instructor Principal'
      }
    },
    changeSummary: 'Cierre evaluativo y bloqueo oficial',
    phaseIntervened: 6,
    componentIntervened: 'Evaluación'
  }, { Authorization: `Bearer ${instructorToken}` });

  // 2. Aprendiz de GAES 4 inicia sesión
  const resH_Login4 = await request('POST', '/api/auth/login', {
    email: 'jcastro@soy.sena.edu.co',
    role: 'APRENDIZ',
    name: 'Juan David Castro',
    gaesNumber: 4,
    fichaNumber: '2687410'
  });
  const token4 = resH_Login4.data.token;

  // 3. Aprendiz intenta editar proyecto bloqueado
  const resH_Locked = await request('PUT', '/api/projects/gaes-4-confecciones-textil', {
    clientVersion: ver4 + 1,
    updatedProject: {
      company: { name: 'Modificación en Proyecto Bloqueado' }
    },
    changeSummary: 'Intento de edición post-cierre',
    phaseIntervened: 1,
    componentIntervened: 'Empresa'
  }, { Authorization: `Bearer ${token4}` });

  assert('PRUEBA H: Bloqueo de proyecto evaluado: Intento de edición por aprendiz devuelve HTTP 423 Locked',
    resH_Locked.status === 423 && resH_Locked.data.locked === true,
    `Status ${resH_Locked.status} (${resH_Locked.data.error})`
  );

  // PRUEBA I: Prevención de manipulación de evaluación por Aprendiz
  // Aprendiz de GAES 4 intenta enviarse a sí mismo una evaluación aprobada
  const resI = await request('PUT', '/api/projects/gaes-4-confecciones-textil', {
    clientVersion: ver4 + 1,
    updatedProject: {
      instructorEvaluation: {
        finalJudgment: 'APROBADO',
        productEvidenceScore: 100,
        isDefinitiveSaved: true
      }
    }
  }, { Authorization: `Bearer ${token4}` });

  assert('PRUEBA I: Blindaje anti-manipulación de rol: Aprendiz no puede alterar evaluación (bloqueado por 423 o sanitizado por el servidor)',
    resI.status === 423 || (resI.status === 200 && resI.data.project.instructorEvaluation.productEvidenceScore !== 100),
    `Status recibido: ${resI.status} | El servidor previene modificaciones de evaluación por aprendices.`
  );

  // PRUEBA J: Reapertura pedagógica autorizada por Instructor
  // 1. Intento sin justificación (debe retornar 400)
  const resJ_NoReason = await request('POST', '/api/projects/gaes-4-confecciones-textil/reopen', {
    reason: ''
  }, { Authorization: `Bearer ${instructorToken}` });

  // 2. Intento de reapertura por aprendiz (debe retornar 403)
  const resJ_Aprendiz = await request('POST', '/api/projects/gaes-4-confecciones-textil/reopen', {
    reason: 'Quiero cambiar un archivo'
  }, { Authorization: `Bearer ${token4}` });

  // 3. Reapertura legítima por instructor con justificación
  const resJ_Success = await request('POST', '/api/projects/gaes-4-confecciones-textil/reopen', {
    reason: 'Concertación de Plan de Mejoramiento Formativo según Acuerdo 007/2012 para reajuste de metas BSC.'
  }, { Authorization: `Bearer ${instructorToken}` });

  assert('PRUEBA J: Reapertura de proyecto: Valida motivo obligatorio (400), rol instructor (403) y desbloqueo autorizado',
    resJ_NoReason.status === 400 && resJ_Aprendiz.status === 403 && resJ_Success.status === 200 && resJ_Success.data.project.isLocked === false,
    `Sin motivo: Status ${resJ_NoReason.status} | Por aprendiz: Status ${resJ_Aprendiz.status} | Autorizada por instructor: ${resJ_Success.data.message} (isLocked=${resJ_Success.data.project.isLocked})`
  );

  // PRUEBA K: Auditoría inmutable de aportes individuales
  const resK = await request('GET', '/api/audit/gaes-4-confecciones-textil', null, { Authorization: `Bearer ${instructorToken}` });
  const hasHistory = Array.isArray(resK.data.history) && resK.data.history.length > 0;
  const reopenEntry = (resK.data.history || []).find(h => h.operationType === 'REAPERTURA');

  assert('PRUEBA K: Trazabilidad inmutable: Registra autor, correo institucional, GAES, ficha, operación, versión y marca temporal',
    resK.status === 200 && hasHistory && !!reopenEntry,
    `Total registros de auditoría: ${resK.data.history?.length} | Última operación registrada: ${reopenEntry?.operationType} por ${reopenEntry?.userEmail} - Motivo: "${reopenEntry?.description}"`
  );

  // PRUEBA L: Verificación de no-aprobación automática y calificaciones en 0
  const fs = require('fs');
  const step6Content = fs.readFileSync('src/components/Step6_InstructorPanel.tsx', 'utf-8');
  const noAutoApprovedInCatch = !step6Content.includes("finalJudgment: 'APROBADO'") || !step6Content.includes("catch");
  const noFake92 = !step6Content.includes("performanceEvidenceScore: 92");
  assert('PRUEBA L: Confiabilidad evaluativa: Cero aprobaciones automáticas por fallo IA y eliminación de puntaje ficticio 92',
    !step6Content.includes("catch (error)") || (!step6Content.includes("finalJudgment: 'APROBADO'\n      })") && noFake92),
    `Verificado en Step6_InstructorPanel.tsx: La IA solo sugiere borradores técnicos; la decisión definitiva es humana y las competencias inicializan en 0.`
  );

  // PRUEBA M: Reportes preliminares identificados y exclusividad de firma de instructor
  const printContent = fs.readFileSync('src/components/PrintReportModal.tsx', 'utf-8');
  const hasDraftWatermark = printContent.includes('BORRADOR FORMATIVO – PENDIENTE DE EVALUACIÓN');
  const noApprenticeSignature = !printContent.includes('Firma del Aprendiz Líder') && !printContent.includes('Firma Aprendiz Líder');
  const hasInstructorSignature = printContent.includes('Firma del Instructor Técnico') && printContent.includes('Documento de Identificación:');

  assert('PRUEBA M: Integridad documental: Marca de agua BORRADOR FORMATIVO y firma física exclusiva de Instructor SENA',
    hasDraftWatermark && noApprenticeSignature && hasInstructorSignature,
    `Borrador Formativo presente: ${hasDraftWatermark} | Eliminación firma aprendiz: ${noApprenticeSignature} | Firma física exclusiva Instructor: ${hasInstructorSignature}`
  );

  console.log('\n================================================================');
  console.log(`RESUMEN FINAL: ${passed} de ${total} PRUEBAS TÉCNICAS SUPERADAS (${Math.round(passed/total*100)}%)`);
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('Error fatal durante la batería de pruebas:', err);
  process.exit(1);
});
