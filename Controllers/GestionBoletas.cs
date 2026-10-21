using Microsoft.AspNetCore.Mvc;

namespace Sistema_Escolar.Controllers
{
    public class GestionBoletas : Controller 
    {
        public IActionResult Boletas()
        {
            return View();
        }
    }
}
