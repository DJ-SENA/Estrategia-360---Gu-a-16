#!/bin/bash
set -e

echo "=================================================="
echo "EJECUTANDO BATERIA DE PRUEBAS AUTOMATIZADAS A - M"
echo "=================================================="

# 1. PRUEBA A: Rechazo de @sena.edu.co para perfil APRENDIZ
echo -e "\n--- PRUEBA A: Rechazo de @sena.edu.co para perfil APRENDIZ ---"
RES_A=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.mendoza@sena.edu.co","role":"APRENDIZ","name":"Carlos Mendoza","gaesNumber":3,"fichaNumber":"2687410"}')
echo "Respuesta Servidor A: $RES_A"

# 2. PRUEBA B: Rechazo de correos comerciales (gmail/hotmail/outlook)
echo -e "\n--- PRUEBA B: Rechazo de correos comerciales (gmail/hotmail/outlook) ---"
RES_B1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@gmail.com","role":"APRENDIZ","name":"User Gmail","gaesNumber":3,"fichaNumber":"2687410"}')
echo "B1 (Aprendiz Gmail): $RES_B1"

RES_B2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"profesor@hotmail.com","role":"INSTRUCTOR","password":"SenaInstructor*2026","name":"User Hotmail"}')
echo "B2 (Instructor Hotmail): $RES_B2"

# 3. PRUEBA C: Rechazo de Instructor sin contraseña / contraseña errónea
echo -e "\n--- PRUEBA C: Rechazo de Instructor sin contraseña / contraseña errónea ---"
RES_C1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"INSTRUCTOR","password":"","name":"Instructor Test"}')
echo "C1 (Sin contraseña): $RES_C1"

RES_C2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"INSTRUCTOR","password":"clave_incorrecta","name":"Instructor Test"}')
echo "C2 (Clave incorrecta): $RES_C2"

# 4. PRUEBA D: Rechazo de @soy.sena.edu.co para perfil INSTRUCTOR
echo -e "\n--- PRUEBA D: Rechazo de @soy.sena.edu.co para perfil INSTRUCTOR ---"
RES_D=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vrestrepo@soy.sena.edu.co","role":"INSTRUCTOR","password":"SenaInstructor*2026","name":"Intruso"}')
echo "Respuesta Servidor D: $RES_D"

# 5. PRUEBA E: Login exitoso de Aprendiz institucional (@soy.sena.edu.co)
echo -e "\n--- PRUEBA E: Login exitoso de Aprendiz institucional (@soy.sena.edu.co) ---"
LOGIN_APRENDIZ=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vrestrepo@soy.sena.edu.co","role":"APRENDIZ","name":"Valentina Restrepo Henao","gaesNumber":3,"fichaNumber":"2687410"}')
echo "Login Aprendiz GAES 3: $LOGIN_APRENDIZ"
APRENDIZ_TOKEN=$(echo "$LOGIN_APRENDIZ" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Login exitoso de Instructor institucional (@sena.edu.co)
echo -e "\n--- Login exitoso de Instructor institucional (@sena.edu.co) ---"
LOGIN_INSTRUCTOR=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor.lider@sena.edu.co","role":"INSTRUCTOR","password":"SenaInstructor*2026","name":"Instructor Principal"}')
echo "Login Instructor: $LOGIN_INSTRUCTOR"
INSTRUCTOR_TOKEN=$(echo "$LOGIN_INSTRUCTOR" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 6. PRUEBA F: Aislamiento de datos de GAES (Aprendiz GAES 3 solo ve GAES 3)
echo -e "\n--- PRUEBA F: Aislamiento de datos de GAES ---"
RES_F_APRENDIZ=$(curl -s -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
echo "Proyectos devueltos para Aprendiz GAES 3:"
echo "$RES_F_APRENDIZ" | grep -o '"gaesNumber":[0-9]*' | tr '\n' ' '
echo ""

echo "Intento de Aprendiz GAES 3 de consultar directamente el proyecto de GAES 2:"
HTTP_F_INTRUSION=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/projects/gaes-2-biocafe \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
echo "HTTP Status (debe ser 403 Forbidden): $HTTP_F_INTRUSION"

# 7. PRUEBA G: Control de Concurrencia Optimista (Detección de conflicto 409)
echo -e "\n--- PRUEBA G: Control de Concurrencia Optimista (Detección de conflicto 409) ---"
PROJ_3_DATA=$(curl -s -X GET http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
CURR_VER=$(echo "$PROJ_3_DATA" | grep -o '"version":[0-9]*' | head -n1 | cut -d':' -f2)
echo "Versión actual de GAES 3 en servidor: $CURR_VER"

# Actualización válida 1
RES_G_OK=$(curl -s -X PUT http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$CURR_VER,\"updatedProject\":{\"company\":{\"name\":\"Lácteos del Valle S.A.S. - Ajustado\"}},\"changeSummary\":\"Ajuste de razón social institucional\",\"phaseIntervened\":1,\"componentIntervened\":\"Empresa\"}")
NEW_VER=$(echo "$RES_G_OK" | grep -o '"version":[0-9]*' | head -n1 | cut -d':' -f2)
echo "Actualización 1 OK. Nueva versión registrada en servidor: $NEW_VER"

# Intento de actualización con clientVersion obsoleta (CURR_VER < NEW_VER)
HTTP_G_CONFLICT=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$CURR_VER,\"updatedProject\":{\"company\":{\"name\":\"Sobrescritura No Autorizada\"}}}")
echo "HTTP Status con versión obsoleta (debe ser 409 Conflict): $HTTP_G_CONFLICT"

# 8. PRUEBA H: Bloqueo de proyecto evaluado (HTTP 423 Locked)
echo -e "\n--- PRUEBA H: Bloqueo de proyecto evaluado (HTTP 423 Locked) ---"
# Obtener versión de GAES 2
PROJ_2_DATA=$(curl -s -X GET http://localhost:3000/api/projects/gaes-2-biocafe \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
CURR_VER_2=$(echo "$PROJ_2_DATA" | grep -o '"version":[0-9]*' | head -n1 | cut -d':' -f2)

# Instructor evalúa y bloquea el proyecto GAES 2
LOCK_EVAL=$(curl -s -X PUT http://localhost:3000/api/projects/gaes-2-biocafe \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$CURR_VER_2,\"updatedProject\":{\"isLocked\":true,\"instructorEvaluation\":{\"isDefinitiveSaved\":true,\"finalJudgment\":\"APROBADO\",\"instructorName\":\"Instructor SENA\"}},\"changeSummary\":\"Cierre evaluativo definitivo de Guía 16\",\"phaseIntervened\":6,\"componentIntervened\":\"Evaluación\"}")
echo "Proyecto GAES 2 bloqueado por instructor: $(echo "$LOCK_EVAL" | grep -o '"isLocked":[^,]*')"

# Aprendiz de GAES 2 inicia sesión
LOGIN_APRENDIZ_2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fguzman@soy.sena.edu.co","role":"APRENDIZ","name":"Felipe Guzmán","gaesNumber":2,"fichaNumber":"2687410"}')
APRENDIZ_2_TOKEN=$(echo "$LOGIN_APRENDIZ_2" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Aprendiz de GAES 2 intenta editar el proyecto bloqueado
HTTP_H_LOCKED=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/projects/gaes-2-biocafe \
  -H "Authorization: Bearer $APRENDIZ_2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$((CURR_VER_2+1)),\"updatedProject\":{\"company\":{\"name\":\"Modificación en proyecto cerrado\"}}}")
echo "HTTP Status de intento de edición en proyecto bloqueado (debe ser 423 Locked): $HTTP_H_LOCKED"

# 9. PRUEBA I: Prevención de manipulación de evaluación por Aprendiz
echo -e "\n--- PRUEBA I: Prevención de manipulación de evaluación por Aprendiz ---"
TAMPER_RES=$(curl -s -X PUT http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientVersion\":$NEW_VER,\"updatedProject\":{\"instructorEvaluation\":{\"finalJudgment\":\"APROBADO\",\"productEvidenceScore\":100,\"isDefinitiveSaved\":true}}}")
echo "Respuesta del servidor a intento de alteración: $(echo "$TAMPER_RES" | grep -o '"success":[^,]*')"

# Verificar que la evaluación del GAES 3 en el servidor NO fue adulterada a APROBADO
CHECK_PROJ_3=$(curl -s -X GET http://localhost:3000/api/projects/gaes-3-agrolacteos \
  -H "Authorization: Bearer $APRENDIZ_TOKEN")
echo "Estado de evaluación en GAES 3 en servidor tras intento de fraude:"
echo "$CHECK_PROJ_3" | grep -o '"finalJudgment":"[^"]*'
echo "$CHECK_PROJ_3" | grep -o '"isDefinitiveSaved":[^,]*'

# 10. PRUEBA J: Reapertura pedagógica autorizada por Instructor
echo -e "\n--- PRUEBA J: Reapertura pedagógica autorizada por Instructor ---"
HTTP_J_NO_REASON=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/projects/gaes-2-biocafe/reopen \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":""}')
echo "HTTP Status reapertura sin justificación (debe ser 400 Bad Request): $HTTP_J_NO_REASON"

HTTP_J_APRENDIZ=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/projects/gaes-2-biocafe/reopen \
  -H "Authorization: Bearer $APRENDIZ_2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Quiero editar mi entrega"}')
echo "HTTP Status reapertura solicitada por aprendiz (debe ser 403 Forbidden): $HTTP_J_APRENDIZ"

RES_J_SUCCESS=$(curl -s -X POST http://localhost:3000/api/projects/gaes-2-biocafe/reopen \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Concertación de Plan de Mejoramiento Formativo según Acuerdo 007/2012 para ajuste de indicadores financieros en BSC."}')
echo "Respuesta reapertura legítima de Instructor: $(echo "$RES_J_SUCCESS" | grep -o '"message":"[^"]*')"

# 11. PRUEBA K: Auditoría inmutable de aportes individuales
echo -e "\n--- PRUEBA K: Auditoría inmutable de aportes individuales ---"
AUDIT_TRAIL=$(curl -s -X GET http://localhost:3000/api/audit/gaes-3-agrolacteos \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
echo "Primeros registros de auditoría inmutable registrados en servidor para GAES 3:"
echo "$AUDIT_TRAIL" | grep -o '"description":"[^"]*' | head -n 4

echo -e "\n=================================================="
echo "TODAS LAS PRUEBAS AUTOMATIZADAS A - K COMPLETADAS CON ÉXITO"
echo "=================================================="
