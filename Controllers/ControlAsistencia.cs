using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class ControlAsistencia : Controller
    {

        public IActionResult Asistencia()
        {
            return View();
        }
    }
}
