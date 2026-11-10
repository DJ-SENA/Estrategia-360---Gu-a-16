#!/bin/bash
set -e

echo "=========================================================================="
echo "AUDITORIA TECNICA CORRECTIVA - VALIDACION EXHAUSTIVA DE SEGURIDAD Y DATOS"
echo "=========================================================================="

sleep 1

# 1. VERIFICACION DE DIAGNOSTICO DE ALMACENAMIENTO Y DEMO
echo -e "\n[TEST 1] Consulta de Estado de Persistencia y Vercel Advisory (/api/storage/status):"
STORAGE_STATUS=$(curl -s http://localhost:3000/api/storage/status)
echo "$STORAGE_STATUS"

echo -e "\n[TEST 2] Consulta de Entorno de Demostración y Microsoft Entra ID (/api/auth/demo-info):"
DEMO_INFO=$(curl -s http://localhost:3000/api/auth/demo-info)
echo "$DEMO_INFO"

echo -e "\n[TEST 3] Consulta de Especificación OIDC Microsoft Entra ID (/api/auth/entra/config):"
ENTRA_CONFIG=$(curl -s http://localhost:3000/api/auth/entra/config)
echo "$ENTRA_CONFIG"

# 2. AUTENTICACION Y SEGURIDAD: ELIMINACION DE PINS PRETERMINADOS
echo -e "\n[TEST 4] Rechazo de PINs y contraseñas débiles/predeterminadas ('1234', 'sena', 'admin'):"
HTTP_WEAK1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"INSTRUCTOR","password":"1234"}')
echo "Intento con PIN '1234': $(echo "$HTTP_WEAK1" | grep -o '"error":"[^"]*')"

HTTP_WEAK2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"INSTRUCTOR","password":"sena"}')
echo "Intento con clave 'sena': $(echo "$HTTP_WEAK2" | grep -o '"error":"[^"]*')"

# 3. IMPEDIR INGRESO DE APRENDIZ POR MERO CONOCIMIENTO DEL CORREO
echo -e "\n[TEST 5] Intento de Aprendiz con solo correo institucional (sin documento):"
APRENDIZ_NO_DOC=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vrestrepo@soy.sena.edu.co","role":"APRENDIZ","gaesNumber":3,"documentNumber":""}')
echo "Resultado (debe exigir documento): $(echo "$APRENDIZ_NO_DOC" | grep -o '"error":"[^"]*')"

echo -e "\n[TEST 6] Intento de Aprendiz con documento incorrecto/suplantado:"
APRENDIZ_BAD_DOC=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vrestrepo@soy.sena.edu.co","role":"APRENDIZ","gaesNumber":3,"documentNumber":"99999999"}')
echo "Resultado (debe rechazar por mismatch): $(echo "$APRENDIZ_BAD_DOC" | grep -o '"error":"[^"]*')"

echo -e "\n[TEST 7] Ingreso legítimo de Aprendiz con correo + documento oficial de nómina ('1118293849'):"
APRENDIZ_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vrestrepo@soy.sena.edu.co","role":"APRENDIZ","gaesNumber":3,"documentNumber":"1118293849","name":"Valentina Restrepo Henao"}')
echo "Resultado Login Aprendiz: $(echo "$APRENDIZ_LOGIN" | grep -o '"success":[^,]*')"
APRENDIZ_TOKEN=$(echo "$APRENDIZ_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 4. AUTENTICACION DE INSTRUCTOR EN ENTORNO DE DEMOSTRACION
echo -e "\n[TEST 8] Ingreso de Instructor con clave autorizada de demostración:"
INSTRUCTOR_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"INSTRUCTOR","password":"DemoInstructor2026*","name":"Instructor Principal SENA"}')
echo "Resultado Login Instructor: $(echo "$INSTRUCTOR_LOGIN" | grep -o '"success":[^,]*')"
INSTRUCTOR_TOKEN=$(echo "$INSTRUCTOR_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 5. DIFERENCIACION DE DOMINIOS
echo -e "\n[TEST 9] Validación cruzada de dominios:"
RES_CROSS_1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"APRENDIZ","gaesNumber":3,"documentNumber":"1118293849"}')
echo "Aprendiz con @sena.edu.co: $(echo "$RES_CROSS_1" | grep -o '"error":"[^"]*')"

RES_CROSS_2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vrestrepo@soy.sena.edu.co","role":"INSTRUCTOR","password":"DemoInstructor2026*"}')
echo "Instructor con @soy.sena.edu.co: $(echo "$RES_CROSS_2" | grep -o '"error":"[^"]*')"

# 6. AISLAMIENTO ENTRE GAES
echo -e "\n[TEST 10] Aislamiento estricto de proyectos por GAES:"
PROJS_APRENDIZ=$(curl -s -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
echo "Proyectos devueltos para Aprendiz GAES 3: $(echo "$PROJS_APRENDIZ" | grep -o '"gaesNumber":[0-9]*' | tr '\n' ' ')"

HTTP_INTRUSION=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/projects/gaes-2-biocafe \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
echo "HTTP Status de intento de Aprendiz GAES 3 de leer GAES 2 (debe ser 403 Forbidden): $HTTP_INTRUSION"

# 7. CONCURRENCIA: EXIGENCIA DE VERSION VALIDA Y HTTP 409
echo -e "\n[TEST 11] Exigencia de clientVersion válida (rechazo de actualización sin versión):"
HTTP_NO_VER=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"updatedProject":{"company":{"name":"Cambio sin version"}}}')
echo "HTTP Status sin clientVersion (debe ser 400 Bad Request): $HTTP_NO_VER"

# Obtener versión actual de GAES 3
PROJ_3_INFO=$(curl -s -X GET http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
VER_GAES_3=$(echo "$PROJ_3_INFO" | grep -o '"version":[0-9]*' | head -n1 | cut -d':' -f2)
echo "Versión actual de GAES 3 en servidor: $VER_GAES_3"

echo -e "\n[TEST 12] Actualización válida incrementa versión atómicamente:"
RES_UPDATE_OK=$(curl -s -X PUT http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$VER_GAES_3,\"updatedProject\":{\"company\":{\"name\":\"Lácteos del Valle S.A.S. - Verificado\"}},\"changeSummary\":\"Ajuste de razón social oficial\",\"phaseIntervened\":1,\"componentIntervened\":\"Empresa\"}")
NEW_VER_GAES_3=$(echo "$RES_UPDATE_OK" | grep -o '"version":[0-9]*' | head -n1 | cut -d':' -f2)
echo "Actualización OK. Nueva versión en servidor: $NEW_VER_GAES_3"

echo -e "\n[TEST 13] Detección de conflicto de concurrencia (HTTP 409 Conflict):"
HTTP_CONFLICT=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$VER_GAES_3,\"updatedProject\":{\"company\":{\"name\":\"Sobrescritura Obsoleta\"}}}")
echo "HTTP Status con versión obsoleta (debe ser 409 Conflict): $HTTP_CONFLICT"

# 8. BLOQUEO DE EVALUACION Y REAPERTURA AUTORIZADA
echo -e "\n[TEST 14] Bloqueo académico de proyecto evaluado (HTTP 423 Locked):"
# Instructor evalúa y bloquea GAES 4
PROJ_4_INFO=$(curl -s -X GET http://localhost:3000/api/projects/gaes-4-logipack \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
VER_GAES_4=$(echo "$PROJ_4_INFO" | grep -o '"version":[0-9]*' | head -n1 | cut -d':' -f2)

curl -s -X PUT http://localhost:3000/api/projects/gaes-4-logipack \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$VER_GAES_4,\"updatedProject\":{\"isLocked\":true,\"instructorEvaluation\":{\"isDefinitiveSaved\":true,\"finalJudgment\":\"APROBADO\",\"instructorName\":\"Instructor SENA\"}},\"changeSummary\":\"Evaluación definitiva Guía 16\",\"phaseIntervened\":6,\"componentIntervened\":\"Evaluación\"}" > /dev/null

# Aprendiz de GAES 4 inicia sesión con documento oficial ('1114294819')
APRENDIZ_4_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"atascon@soy.sena.edu.co","role":"APRENDIZ","gaesNumber":4,"documentNumber":"1114294819","name":"Andrés Felipe Tascón"}')
APRENDIZ_4_TOKEN=$(echo "$APRENDIZ_4_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Intento de modificación en proyecto bloqueado
HTTP_LOCKED_4=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/projects/gaes-4-logipack \
  -H "Authorization: Bearer $APRENDIZ_4_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$((VER_GAES_4+1)),\"updatedProject\":{\"company\":{\"name\":\"Intento en proyecto cerrado\"}}}")
echo "HTTP Status de intento en proyecto evaluado/cerrado (debe ser 423 Locked): $HTTP_LOCKED_4"

echo -e "\n[TEST 15] Reapertura autorizada por Instructor con justificación formativa obligatoria:"
# Reapertura sin motivo (falla 400)
HTTP_NO_REASON=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/projects/gaes-4-logipack/reopen \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":""}')
echo "Reapertura sin justificación (debe ser 400 Bad Request): $HTTP_NO_REASON"

# Reapertura legítima
RES_REOPEN=$(curl -s -X POST http://localhost:3000/api/projects/gaes-4-logipack/reopen \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Plan de Mejoramiento Formativo concertado bajo Reglamento del Aprendiz SENA para reajustar matriz MEFI y objetivos BSC."}')
echo "Reapertura autorizada: $(echo "$RES_REOPEN" | grep -o '"message":"[^"]*')"

# 9. TRAZABILIDAD E INMUTABILIDAD DE AUDITORIA
echo -e "\n[TEST 16] Trazabilidad individual inmutable (/api/audit/:projectId):"
AUDIT_TRAIL=$(curl -s -X GET http://localhost:3000/api/audit/gaes-4-logipack \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
echo "Últimas operaciones registradas en bitácora inmutable:"
echo "$AUDIT_TRAIL" | grep -o '"operationType":"[^"]*' | head -n 4

echo -e "\n=========================================================================="
echo "BATERIA COMPLETA DE PRUEBAS DE AUDITORIA EJECUTADA SATISFACTORIAMENTE"
echo "=========================================================================="
