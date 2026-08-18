##Arquitectura

Quiero crear un nuevo proyecto next.js para desplegar en vercel y supabase basado en @once-ui de vercel. 
Debe ser tanto para desktop como para movil.


## Funcionalidad
Este proyecto será una pizarra de jugadas de futbol sala. Tiene que servir para diferentes clubs de futbol sala. Existirá un formulario de registro del club donde podrán subir el logo, elegir el color e informar los datos del administrador del club.

Dentro de un club se podrán crear diferentes equipos y dar de alta entrenadores que podrán crear las jugadas mediante una pizarra tactil.

Por lo tanto, quedará una estructura:

Club -> Administrador (podrá luego darse de alta más administradores) -> Equipos -> Entrenadores y jugadores

Un entrenador podrá estar asignado a más de un equipo.
Un jugador también podrá estar asignado a más de un equipo.

Habrá dos modos para las jugadas:
1- Modo edición. Los entrenadores podrán editar las jugadas y compartirlas con los jugadores del equipo o con los otros entrenadores.
2- Modo visualización. Los jugadores podrán visualizar las jugadas pero no podrán editar.

Si una jugada es compartida con otro entrenador, este podrá visualizarla y si le interesa, podrá copiarla a su catalogo de jugadas. La copia la podrá editar. Además un entrenador tendrá su catalogo de jugadas que podrá asignar a los diferentes equipos que entrena para utilizar las mismas.

La pizarra de edición debe ser:
    - Representar un campo de futbol sala completo.
    - Diferenciar mediante fichas los jugadores de cada equipo (un equipo con el color elegido por el admin para representar al equipo local y otro en un color diferente para el visitante).
    - Los equipos pueden estar compuestos por:
        - 1 portero y 4 jugadores
        - 5 jugadores de campo donde uno lleva una camiseta de otro color (portero jugador)
        - 1 portero y 3 jugadores en caso de expulsión. 
    - Cuando el entrenador cree una nueva jugada, antes de empezar tendrá que:
        - Elegir tipo de jugada (corner, falta, fuera de banda, libre indirecto, portero jugador, defensa, ataque posicional).
        - Elegir la configuración del equipo local y del equipo visitante
    - A partir de lo elegido, verá el campo con los jugadores y el balón.
    - Podrá arrastrar los jugadores para ponerlos en una posición inicial. Cuando acabe tendrá un botón de "guardar posición inicial" y empezará las secuencias.
    - para generar las secuencias podrá:
        - mover jugadores.
        - mover el balón.
        - Cuando mueva un jugador se dibujará una linea discontinua entre el punto de origen y el punto destino. Esta linea se podrá curvar.
        - Si el jugador que se mueve tiene el balón en posesión la linea será continua.
        - El balón se puede desplazar también con una linea discontinua.
    - Cuando acabe una secuencia tendrá un botón de guardar secuencia y podrá hacer otra serie de movimientos. 
    - Podrá guardar todas las secuencias que quiera y dispondrá un botón de finalizar para guardar la jugada y cerrarla.

Para visualizar la jugada:
    - Se verá el movimiento de las secuencias definidas paso a paso pudiendo parar, rebovinar o volver al inicio así como cambiar a cada una de las secuencias.


Edición:
    - Las jugadas tienen que poder editarse. 
        - Se seleccionará la secuencia a editar y desde el punto de partida, se podrá cambiar el movimiento de los jugadores y del balón.
