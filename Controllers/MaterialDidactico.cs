using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class MaterialDidactico : Controller
    {

        public IActionResult Materiales()
        {
            return View();
        }
    }
}
