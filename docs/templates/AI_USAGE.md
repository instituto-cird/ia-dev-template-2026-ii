# AI_USAGE.md · Registro de uso de IA

> Este archivo documenta el **origen** del trabajo: qué hizo la IA, qué hizo la persona y cómo se verificó. Se completa en cada laboratorio. En las revisiones y en la defensa final se puede preguntar por cualquier entrada. El formato es un criterio del programa.

## Cuándo registrar

**Se registra cuando hubo una decisión, no cuando hubo un autocompletado.**

Se registra si:
- El pedido se reescribió tres veces o más hasta obtener el resultado
- La salida no funcionó al primer intento y hubo que depurarla
- Se aceptó un diseño que la persona no había pensado antes
- Se **rechazó** una sugerencia (por seguridad, rendimiento o corrección)
- La IA **inventó** algo (librería, función, dato) y se detectó
- Un agente modificó varios archivos o ejecutó comandos
- Se usó IA para diagnosticar un error

No hace falta registrar el autocompletado de un `import`, de un nombre de variable o de un bloque que la persona iba a escribir de todos modos.

> **Regla práctica:** si dentro de tres meses no se va a recordar por qué el código quedó así, se registra.

## Niveles de autonomía

Se usan los cinco niveles de Feng, McDonald y Zhang (2025), definidos por el rol de la persona frente al agente: **1 operador** (la persona planifica y ejecuta; la IA sugiere a pedido) · **2 colaborador** (trabajo compartido; la persona puede tomar el control) · **3 consultor** (el agente planifica y ejecuta; la persona orienta en momentos clave) · **4 aprobador** (el agente trabaja solo; la persona destraba bloqueos y aprueba acciones importantes) · **5 observador** (la persona solo revisa el registro o detiene al agente).

Fuente: Feng, K. J. K., McDonald, D. W. y Zhang, A. X. (2025). *Levels of Autonomy for AI Agents*. arXiv:2506.12469. Preprint sin revisión por pares.

---

## Entradas

### Entrada 000 · Lab 0 · Onboarding

| Campo | Detalle |
|---|---|
| Fecha | AAAA-MM-DD |
| Herramienta | |
| Nivel de autonomía | ninguno / 1 operador / 2 colaborador / 3 consultor / 4 aprobador / 5 observador |
| Para qué se usó | |
| Qué hizo la IA | |
| Qué hubo que corregir o rehacer | nada / una parte / casi todo, y qué |
| Cómo se verificó | (prueba, CI, lectura, comparación con la documentación…) |
| Qué decisión fue propia | |
| Commit o PR | |

<!-- Copiar el bloque de la entrada para cada nueva (001, 002…) -->

---

## Resumen por laboratorio

Al cerrar cada laboratorio se completa una fila. Al final del programa, cada participante tiene sus propios números de **autonomía** y **retrabajo**, dos métricas que aparecen en descripciones de puestos de equipos que trabajan con agentes (revisadas por el programa en 2026, uso interno).

| Lab | Entradas | Nivel más usado | Parte hecha por el agente (aprox. %) | Parte que hubo que rehacer (aprox. %) |
|---|---|---|---|---|
| Lab 0 | | | | |
| Lab 1 | | | | |
| Lab 2 | | | | |
| Lab 3 | | | | |
| Lab 4 | | | | |
