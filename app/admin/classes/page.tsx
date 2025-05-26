"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Pencil, Trash2, BookOpen, School, Users, Search, CheckCircle, Circle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClass, updateClass, deleteClass, getClassStudents, getClassTeacher } from "@/app/actions/classes"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getCurrentHijriDate, getHijriYear, formatHijriDate } from "@/lib/utils/hijri-date"
import { HijriDatePicker } from "@/components/ui/hijri-date-picker"

// Configuration for academic level display names
const ACADEMIC_LEVEL_DISPLAY = {
  "Default": "المرحلة الابتدائية",
  "khb": "مرحلة KHB",
  "المرحلة الاعدادية": "المرحلة الاعدادية",
  "المرحلة الثانوية": "المرحلة الثانوية"
};

// Add current Hijri year to the level display
ACADEMIC_LEVEL_DISPLAY[getHijriYear(new Date()).toString()] = `العام الدراسي ${getHijriYear(new Date())}هـ`;

// Helper to get display name for academic level
function getAcademicLevelDisplay(level: string): string {
  return ACADEMIC_LEVEL_DISPLAY[level as keyof typeof ACADEMIC_LEVEL_DISPLAY] || level;
}

// Helper function to format academic year display
function formatAcademicYear(year: string | null | undefined): string {
  if (!year) return "غير محدد";
  
  // If it's clearly a year (numeric), add هـ suffix
  if (/^\d+$/.test(year)) {
    return `${year}هـ`;
  }
  
  // Otherwise return as is
  return year;
}

export default function ClassesPage() {
  // Initialize supabase client once with fallback
  const [supabase] = useState(() => {
    try {
      console.log("Attempting to create Supabase client via imported method...");
      let client;
      
      try {
        // First try the imported client creator
        client = createClient();
        console.log("Supabase client created successfully via imported method");
      } catch (importError) {
        console.error("Failed to create Supabase client via imported method:", importError);
        
        // If that fails, try the direct client creation method
        console.log("Attempting to create Supabase client directly...");
        client = createClientComponentClient();
        console.log("Supabase client created successfully via direct method");
      }
      
      // Test the client with a simple method call
      console.log("Testing client connection:", !!client, typeof client.from);
      
      return client;
    } catch (error) {
      console.error("Failed to create Supabase client after all attempts:", error);
      toast({
        title: "خطأ في الاتصال",
        description: "فشل الاتصال بقاعدة البيانات",
        variant: "destructive",
      });
      return null;
    }
  });
  
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [academicLevels, setAcademicLevels] = useState<string[]>([])
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [levelField, setLevelField] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentClassId, setCurrentClassId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    grade: academicLevels.includes("Default") ? "Default" : "",
    section: "",
    teacherId: "none",
    studentIds: [] as string[],
    academic_year: getHijriYear(new Date()).toString(), // Default to current Hijri year
    semester: "1", // Default to first semester
    academic_year_date: new Date(), // Date object for the Hijri date picker
  })
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("")
  const [studentSearchTerm, setStudentSearchTerm] = useState("")

  useEffect(() => {
    if (supabase) {
    loadData()
    } else {
      setIsLoading(false);
    }
  }, [supabase])

  async function loadData() {
    if (!supabase) {
      console.error("Supabase client not initialized");
      toast({
        title: "خطأ في الاتصال",
        description: "فشل الاتصال بقاعدة البيانات",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true)
    try {
      console.log("Testing Supabase connection with a simple query...");
      try {
        // Test with a very simple query first
        const { data: testData, error: testError } = await supabase
          .from('classes')
          .select('count')
          .limit(1);
          
        if (testError) {
          console.error("Test query failed:", testError);
          throw new Error("Database connection test failed: " + (testError.message || JSON.stringify(testError)));
        }
        console.log("Test query successful:", testData);
      } catch (testErr) {
        console.error("Test query caught error:", testErr);
        throw testErr;
      }

      // Load classes
      console.log("Loading classes...");
      let classesData;
      try {
        // First get a sample record to check the schema
        const { data: sampleData, error: sampleError } = await supabase
          .from("classes")
          .select("*")
          .limit(1);

        if (sampleError) {
          console.error("Sample class error:", sampleError);
        } else if (sampleData && sampleData.length > 0) {
          console.log("Sample class record columns:", Object.keys(sampleData[0]));
          console.log("Sample data:", JSON.stringify(sampleData[0], null, 2));
          
          // Check which field might contain the academic level
          const possibleLevelFields = ["academic_level", "level", "grade", "class_level", "year", "type"];
          let detectedLevelField = "";
          
          for (const field of possibleLevelFields) {
            if (field in sampleData[0]) {
              detectedLevelField = field;
              console.log(`Found level field: ${detectedLevelField} with value:`, sampleData[0][field]);
              break;
            }
          }
          
          // If no specific field was found, look for any string field that might contain level info
          if (!detectedLevelField) {
            Object.entries(sampleData[0]).forEach(([key, value]) => {
              if (typeof value === 'string' && !key.includes('id') && key !== 'name' && key !== 'created_at') {
                console.log(`Potential level field ${key}:`, value);
                if (!detectedLevelField) {
                  detectedLevelField = key;
                }
              }
            });
          }
          
          setLevelField(detectedLevelField || "name");  // Default to name if nothing else found
          console.log("Using level field:", detectedLevelField || "name");
        }

        // Use the detected level field if available
        const { data, error } = await supabase
        .from("classes")
          .select("*");

        if (error) {
          console.error("Classes error details:", error.code, error.message, error.details, error.hint);
          throw new Error(error.message || "Failed to fetch classes");
        }
        
        console.log("Classes data received:", data ? data.length : 0);
        if (data && data.length > 0) {
          console.log("First class data:", data[0]);
        }
        classesData = data || [];
      } catch (classesErr) {
        console.error("Classes query caught error:", classesErr);
        throw classesErr;
      }

      // Make sure we have valid data before proceeding
      if (!classesData || classesData.length === 0) {
        console.log("No classes data received or empty array");
        // Continue with empty data rather than throwing an error
        classesData = [];
      }

      // Extract unique academic levels (grades) from classes
      console.log("Processing academic levels...");
      
      // First get all unique values from academic_year field
      const rawLevels = Array.from(new Set(classesData.map(cls => cls.academic_year))).filter(Boolean);
      console.log("Raw academic_year values found:", rawLevels);
      
      // Also check if we have any "khb" values that might be in other fields
      const hasKHB = classesData.some(cls => 
        Object.values(cls).some(val => 
          typeof val === 'string' && val.toLowerCase() === 'khb'
        )
      );
      
      // Build our list of levels with meaningful values first
      let levels = [...rawLevels];
      
      // Add khb level if found
      if (hasKHB && !levels.includes('khb')) {
        levels.push('khb');
      }
      
      // Add standard academic levels that should always be available
      const standardLevels = ['Default', 'المرحلة الاعدادية', 'المرحلة الثانوية'];
      for (const level of standardLevels) {
        if (!levels.includes(level)) {
          levels.push(level);
        }
      }
      
      console.log("Final academic levels:", levels);
      setAcademicLevels(levels);
      setLevelField('academic_year'); // Consistently use academic_year as the level field
      
      if (!selectedLevel) {
        setSelectedLevel("all"); // Always default to "all" to show everything initially
      }

      console.log("Total classes found:", classesData.length);
      console.log("All class records:", classesData);

      // Load teachers
      console.log("Loading teachers...");
      let teachersData;
      try {
        const { data, error } = await supabase
        .from("users")
        .select("id, full_name, user_code")
        .eq("role_id", 3)
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Teachers error details:", error.code, error.message, error.details, error.hint);
          throw new Error(error.message || "Failed to fetch teachers");
        }
        
        console.log("Teachers data received:", data ? data.length : 0);
        teachersData = data || [];
      } catch (teachersErr) {
        console.error("Teachers query caught error:", teachersErr);
        throw teachersErr;
      }

      // Load students
      console.log("Loading students...");
      let studentsData;
      try {
        const { data, error } = await supabase
        .from("users")
        .select("id, full_name, user_code")
        .eq("role_id", 1)
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Students error details:", error.code, error.message, error.details, error.hint);
          throw new Error(error.message || "Failed to fetch students");
        }
        
        console.log("Students data received:", data ? data.length : 0);
        studentsData = data || [];
      } catch (studentsErr) {
        console.error("Students query caught error:", studentsErr);
        throw studentsErr;
      }

      // Load class-student relationships
      console.log("Loading class-student relationships...");
      let classStudentsData;
      try {
        // First get a sample record to check the schema
        const { data: sampleData, error: sampleError } = await supabase
          .from("class_student")
          .select("*")
          .limit(1);

        if (sampleError) {
          console.error("Sample class_student error:", sampleError);
          classStudentsData = [];
        } else if (sampleData && sampleData.length > 0) {
          console.log("Sample class_student record columns:", Object.keys(sampleData[0]));
          console.log("Sample class_student data:", JSON.stringify(sampleData[0], null, 2));
          
          // Get all class-student relationships
          const { data, error } = await supabase
            .from("class_student")
            .select("*");

          if (error) {
            console.error("Class students error details:", error.code, error.message, error.details, error.hint);
            classStudentsData = [];
          } else {
            console.log("Class students data received:", data ? data.length : 0);
            classStudentsData = data || [];
          }
        } else {
          classStudentsData = [];
        }
      } catch (relationshipsErr) {
        console.error("Relationships query caught error:", relationshipsErr);
        classStudentsData = [];
      }
      
      // Load class-teacher relationships
      console.log("Loading class-teacher relationships...");
      let classTeachersData;
      try {
        const { data, error } = await supabase
          .from("class_teacher")
          .select("*");

        if (error) {
          console.error("Class teachers error details:", error.code, error.message, error.details, error.hint);
          classTeachersData = [];
        } else {
          console.log("Class teachers data received:", data ? data.length : 0);
          classTeachersData = data || [];
        }
      } catch (relationshipsErr) {
        console.error("Teacher relationships query caught error:", relationshipsErr);
        classTeachersData = [];
      }

      // Now manually join the teachers with classes
      console.log("Enhancing classes data and joining with teachers...");
      const enhancedClasses = classesData.map((cls) => {
        // Find students in this class
        const classStudents = classStudentsData.filter((cs) => cs.class_id === cls.id);
        
        // Extract section from name if it exists (format: "Class-Section")
        const nameParts = cls.name.split('-');
        const className = nameParts[0]?.trim() || cls.name;
        const section = nameParts.length > 1 ? nameParts[1]?.trim() : "";
        
        // Find teacher using class_teacher relationship
        let teacher = null;
        if (classTeachersData) {
          const classTeacher = classTeachersData.find(ct => ct.class_id === cls.id);
          if (classTeacher) {
            teacher = teachersData.find(t => t.id === classTeacher.teacher_id) || null;
          }
        }
        
        // Fix any inconsistencies in the level field value
        let levelValue = cls[levelField];
        
        // If we're using academic_year field but the value is "khb", it's misplaced
        if (levelField === "academic_year" && levelValue === "khb") {
          console.log(`Class ${cls.name} has academic_year="khb", using it as grade label`);
        }
        
        // If the name is clearly a student name and not a class name, 
        // let's extract a more meaningful class name
        let displayClassName = className;
        if (className.includes(" ") && !className.includes("الصف") && !className.includes("مرحلة")) {
          // This might be a student name, try to extract a better class name
          displayClassName = section || "صف";
        }
        
        return {
          ...cls,
          className: displayClassName,
          section,
          studentCount: classStudents.length,
          teacher: teacher,
          grade: levelValue || "Default"
        };
      });

      console.log("Setting state with processed data...");
      setClasses(enhancedClasses);
      setTeachers(teachersData || []);
      setStudents(studentsData || []);
      console.log("Data loading complete");
    } catch (error: any) {
      console.error("Error loading data:", error);
      
      // Check if error is a simple object that needs pretty printing
      const errorMessage = typeof error === 'object' && error !== null 
        ? (error.message || JSON.stringify(error, null, 2))
        : String(error);
      
      toast({
        title: "خطأ في تحميل البيانات",
        description: errorMessage || "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      grade: academicLevels.includes("Default") ? "Default" : "",
      section: "",
      teacherId: "none",
      studentIds: [],
      academic_year: getHijriYear(new Date()).toString(), // Default to current Hijri year
      semester: "1", // Default to first semester
      academic_year_date: new Date(), // Date object for the Hijri date picker
    })
    setIsEditMode(false)
    setCurrentClassId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!supabase) {
      toast({
        title: "خطأ في الاتصال",
        description: "فشل الاتصال بقاعدة البيانات",
        variant: "destructive",
      });
      return;
    }

    try {
      // Combine class name and section for storage
      const fullClassName = formData.section 
        ? `${formData.name}-${formData.section}` 
        : formData.name
      
      // Create a class object with required fields
      const classData: {
        name: string;
        academic_year: string;
        semester: string;
        [key: string]: string | number | null | undefined;  // Index signature to allow dynamic fields
      } = {
        name: fullClassName,
        academic_year: formData.grade, // Use grade field as academic_year for consistency
        semester: formData.semester,
      };

      console.log("Saving class data:", classData);

      let result;
      if (isEditMode && currentClassId) {
        // Update class using server action
        result = await updateClass(
          currentClassId,
          classData,
          formData.teacherId === "none" ? null : formData.teacherId,
          formData.studentIds
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update class");
        }

        toast({
          title: "تم تحديث الصف",
          description: "تم تحديث بيانات الصف بنجاح",
        });
      } else {
        // Create new class using server action
        result = await createClass(
          classData,
          formData.teacherId === "none" ? null : formData.teacherId,
          formData.studentIds
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to create class");
        }

        toast({
          title: "تم إنشاء الصف",
          description: "تم إنشاء الصف بنجاح",
        });
      }

      // Reload data and close dialog
      await loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving class:", error);
      
      // More comprehensive error logging
      let errorMessage = "حدث خطأ أثناء حفظ الصف";
      
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
          console.error("Error name:", error.name);
          console.error("Error stack:", error.stack);
        } else if (typeof error === 'object') {
          console.error("Error as object:", JSON.stringify(error, null, 2));
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: "خطأ في حفظ الصف",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  async function handleEdit(classId: number) {
    if (!supabase) {
      toast({
        title: "خطأ في الاتصال",
        description: "فشل الاتصال بقاعدة البيانات",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get class data
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single()

      if (classError) {
        console.error("Error fetching class:", classError);
        throw classError;
      }

      // Get students in class using server action
      const studentsResult = await getClassStudents(classId);
      const studentIds = studentsResult.success ? studentsResult.studentIds : [];
      
      // Get assigned teacher for this class using server action
      const teacherResult = await getClassTeacher(classId);
      const teacherId = teacherResult.success ? (teacherResult.teacherId || "none") : "none";

      // Parse class name and section
      const nameParts = classData.name.split('-')
      const className = nameParts[0]?.trim() || classData.name
      const section = nameParts.length > 1 ? nameParts[1]?.trim() : ""

      // Get the grade/level value using the detected field name
      const grade = levelField && classData[levelField] 
        ? classData[levelField]
        : "";
      
      console.log("Editing class with grade/level:", grade, "from field:", levelField);

      // Set form data
      setFormData({
        name: className,
        grade: grade,
        section: section,
        teacherId: teacherId,
        studentIds: studentIds,
        academic_year: classData.academic_year || getHijriYear(new Date()).toString(),
        semester: classData.semester || "1",
        academic_year_date: new Date(classData.academic_year_date),
      })

      setIsEditMode(true)
      setCurrentClassId(classId)
      setIsDialogOpen(true)
    } catch (error: any) {
      console.error("Error editing class:", error)
      toast({
        title: "خطأ في تحرير الصف",
        description: error.message || "حدث خطأ أثناء تحرير الصف",
        variant: "destructive",
      })
    }
  }

  async function handleDelete(classId: number) {
    if (!supabase) {
      toast({
        title: "خطأ في الاتصال",
        description: "فشل الاتصال بقاعدة البيانات",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm("هل أنت متأكد من حذف هذا الصف؟")) return

    try {
      // Delete class using server action
      const result = await deleteClass(classId);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete class");
      }

      toast({
        title: "تم حذف الصف",
        description: "تم حذف الصف بنجاح",
      })

      // Reload data
      await loadData()
    } catch (error: any) {
      console.error("Error deleting class:", error)
      toast({
        title: "خطأ في حذف الصف",
        description: error.message || "حدث خطأ أثناء حذف الصف",
        variant: "destructive",
      })
    }
  }

  function handleStudentSelection(studentId: string) {
    setFormData((prev) => {
      if (prev.studentIds.includes(studentId)) {
        return {
          ...prev,
          studentIds: prev.studentIds.filter((id) => id !== studentId),
        }
      } else {
        return {
          ...prev,
          studentIds: [...prev.studentIds, studentId],
        }
      }
    })
  }

  // Filter classes by selected academic level
  const filteredClasses = selectedLevel
    ? selectedLevel === "all" 
      ? classes // Show all classes when "all" is selected
      : classes.filter(cls => {
          // Log for debugging
          console.log(`Filtering class: ${cls.name}, level: ${selectedLevel}, academic_year: ${cls.academic_year}`);
          
          // Handle Default academic level
          if (selectedLevel === "Default") {
            // Consider a class as Default level if:
            // 1. It has no academic_year value (null/undefined/"")
            // 2. Its academic_year is a simple year (like "2025") that we want to show with Default
            // 3. Its academic_year is "Default"
            return !cls.academic_year || 
                  cls.academic_year === "Default" || 
                  (typeof cls.academic_year === 'string' && cls.academic_year.toLowerCase().includes('ابتدائي'));
          }
          
          // Handle Middle School level
          if (selectedLevel === "المرحلة الاعدادية") {
            return cls.academic_year === "المرحلة الاعدادية" || 
                  (typeof cls.academic_year === 'string' && cls.academic_year.toLowerCase().includes('اعدادي'));
          }
          
          // Handle High School level
          if (selectedLevel === "المرحلة الثانوية") {
            return cls.academic_year === "المرحلة الثانوية" || 
                  (typeof cls.academic_year === 'string' && cls.academic_year.toLowerCase().includes('ثانوي'));
          }
          
          // Handle KHB academic level (check all fields)
          if (selectedLevel.toLowerCase() === "khb") {
            return Object.values(cls).some(val => 
              typeof val === 'string' && val.toLowerCase() === 'khb'
            );
          }
          
          // For other levels, check if academic_year matches
          return cls.academic_year === selectedLevel;
        })
    : classes; // Display all classes if no level is selected

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(teacher => {
    if (!teacherSearchTerm) return true;
    return teacher.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) || 
           teacher.user_code.toLowerCase().includes(teacherSearchTerm.toLowerCase());
  });

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    if (!studentSearchTerm) return true;
    return student.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
           student.user_code.toLowerCase().includes(studentSearchTerm.toLowerCase());
  });

  // Get selected students for displaying badges
  const selectedStudents = students.filter(student => formData.studentIds.includes(student.id));

  // Show connection error if supabase is null
  if (!supabase) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">إدارة الصفوف</h1>
        <div className="p-6 bg-destructive/10 rounded-lg text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">خطأ في الاتصال</h2>
          <p>فشل الاتصال بقاعدة البيانات. يرجى إعادة تحميل الصفحة أو الاتصال بمسؤول النظام.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            إعادة تحميل الصفحة
          </Button>
        </div>
      </div>
    );
  }

  // For debugging only - will be removed in production
  console.log("DEBUG - All classes:", classes);
  console.log("DEBUG - Academic levels detected:", academicLevels);
  console.log("DEBUG - Level field being used:", levelField);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">إدارة الصفوف</h1>
          <p className="text-muted-foreground mt-2">إنشاء وتعديل الصفوف الدراسية والشعب</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white rounded-md px-4 py-2 transition-all shadow-md hover:shadow-lg"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          إضافة صف جديد
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">جاري تحميل الصفوف...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4 items-center">
              <School className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">المراحل الدراسية</h2>
            </div>
            {classes.length > 0 && (
              <Badge variant="outline" className="px-3 py-1 rounded-full text-sm bg-primary/5">
                {classes.length} صف دراسي
              </Badge>
            )}
          </div>
          
          {/* Academic Levels Tabs */}
          <Tabs 
            defaultValue={selectedLevel || "all"}
            onValueChange={value => setSelectedLevel(value)}
            className="mb-6"
          >
            <TabsList className="mb-4 flex flex-wrap gap-1">
              <TabsTrigger value="all" className="rounded-full px-4">جميع المراحل</TabsTrigger>
              {academicLevels.map(level => (
                <TabsTrigger key={level} value={level} className="rounded-full px-4">
                  {getAcademicLevelDisplay(level)}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Add an "all" tab to show all classes */}
            <TabsContent key="all" value="all" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">جميع الصفوف</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <Card key={cls.id} className="bg-card shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle>{cls.className}</CardTitle>
                          {cls.section && (
                            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
                              الشعبة: {cls.section}
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          {cls.teacher?.full_name ? `المعلم: ${cls.teacher.full_name}` : "لا يوجد معلم معين"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>عدد الطلاب: {cls.studentCount}</span>
                          </div>
                          {cls.academic_year && (
                            <Badge variant="outline" className="w-fit">
                              {cls.academic_year === "khb" ? "مرحلة KHB" : 
                               cls.academic_year?.includes("ابتدائي") ? "المرحلة الابتدائية" : 
                               formatAcademicYear(cls.academic_year)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(cls.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          تعديل
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(cls.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          حذف
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="relative">
                        <BookOpen className="h-12 w-12 text-muted-foreground opacity-30" />
                        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl">📭</span>
                      </div>
                      <p className="text-lg font-medium">لا توجد صفوف دراسية</p>
                      <Button 
                        onClick={() => { resetForm(); setIsDialogOpen(true); }}
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        إضافة صف جديد
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Individual level tabs */}
            {academicLevels.map(level => (
              <TabsContent key={level} value={level} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">الصفوف في {getAcademicLevelDisplay(level)}</h3>
                  
                  {filteredClasses.length > 0 && (
                    <Badge variant="outline" className="mr-2 bg-primary/5">
                      {filteredClasses.length} صف
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map((cls) => (
                      <Card key={cls.id} className="bg-card shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between">
                            <CardTitle>{cls.className}</CardTitle>
                            {cls.section && (
                              <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
                                الشعبة: {cls.section}
                              </span>
                            )}
                          </div>
                          <CardDescription>
                            {cls.teacher?.full_name ? `المعلم: ${cls.teacher.full_name}` : "لا يوجد معلم معين"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>عدد الطلاب: {cls.studentCount}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>السنة الدراسية: {formatAcademicYear(cls.academic_year)}</span>
                              <span>•</span>
                              <span>الفصل: {cls.semester || "1"}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(cls.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            تعديل
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(cls.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            حذف
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="relative">
                          <BookOpen className="h-12 w-12 text-muted-foreground opacity-30" />
                          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl">📭</span>
                        </div>
                        <p className="text-lg font-medium">لا توجد صفوف في هذه المرحلة</p>
                        <Button 
                          onClick={() => { resetForm(); setIsDialogOpen(true); }}
                          variant="outline" 
                          size="sm"
                          className="mt-2"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          إضافة صف جديد
              </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Add/Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "تعديل الصف" : "إضافة صف جديد"}</DialogTitle>
                <DialogDescription>
                  {isEditMode
                    ? "قم بتعديل بيانات الصف الدراسي والشعبة" 
                    : "قم بإدخال بيانات الصف الدراسي والشعبة"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 py-4">
                  {/* المرحلة الدراسية + الصف - First row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade">المرحلة الدراسية</Label>
                      <Select
                        value={formData.grade}
                        onValueChange={(value) => setFormData({ ...formData, grade: value })}
                      >
                        <SelectTrigger id="grade" className="bg-card border-input">
                          <SelectValue placeholder="اختر المرحلة الدراسية" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicLevels.map(level => (
                            <SelectItem key={level} value={level} className="flex items-center gap-2">
                              {getAcademicLevelDisplay(level)}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                            مرحلة أخرى (إدخال يدوي)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Show manual input field if custom is selected */}
                      {formData.grade === "custom" && (
                        <Input
                          className="mt-2"
                          placeholder="أدخل اسم المرحلة الدراسية"
                          value={formData.academic_year !== formData.grade ? formData.academic_year : ""}
                          onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">الصف</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="مثال: الصف الأول"
                      />
                    </div>
                  </div>
                  
                  {/* الشعبة + السنة الدراسية + الفصل الدراسي - Second row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="section" className="flex items-center gap-2">
                        <span>الشعبة</span>
                      </Label>
                      <Input
                        id="section"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        placeholder="مثال: أ، ب، ج (اختياري)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="academic_year" className="flex items-center gap-2">
                        <span>السنة الدراسية (هجري)</span>
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <HijriDatePicker
                            value={formData.academic_year_date}
                            onChange={(date) => {
                              if (date) {
                                const hijriYear = getHijriYear(date);
                                setFormData({ 
                                  ...formData, 
                                  academic_year_date: date,
                                  academic_year: hijriYear.toString() 
                                });
                              }
                            }}
                            placeholder="اختر السنة الدراسية"
                          />
                        </div>
                        <Input
                          id="academic_year"
                          value={formData.academic_year}
                          onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                          required
                          placeholder="مثال: 1445"
                          className="w-24"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester" className="flex items-center gap-2">
                        <span>الفصل الدراسي</span>
                      </Label>
                      <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                      >
                        <SelectTrigger id="semester" className="bg-card border-input">
                          <SelectValue placeholder="اختر الفصل الدراسي" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                            الفصل الأول
                          </SelectItem>
                          <SelectItem value="2" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                            الفصل الثاني
                          </SelectItem>
                          <SelectItem value="3" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
                            الفصل الصيفي
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* معلم الصف - Third row */}
                  <div className="space-y-2">
                    <Label htmlFor="teacher" className="flex items-center gap-2">
                      <School className="h-4 w-4 text-primary" />
                      معلم الصف
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="بحث عن المعلم بالاسم أو الرمز"
                        value={teacherSearchTerm}
                        onChange={(e) => setTeacherSearchTerm(e.target.value)}
                        className="mb-2 pl-10 pr-4"
                      />
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Select
                      value={formData.teacherId}
                      onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                    >
                      <SelectTrigger id="teacher" className="bg-card border-input">
                        <SelectValue placeholder="اختر معلم الصف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-muted-foreground">بدون معلم</SelectItem>
                        {filteredTeachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id} className="py-2">
                            <div className="flex items-center gap-2">
                              <span>{teacher.full_name}</span>
                              <Badge variant="outline" className="text-xs bg-primary/5">
                                {teacher.user_code}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* الطلاب - Fourth row */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        الطلاب 
                        {formData.studentIds.length > 0 && (
                          <Badge variant="secondary" className="ml-2 bg-primary/20">
                            {formData.studentIds.length} طالب تم اختيارهم
                          </Badge>
                        )}
                      </Label>
                      {formData.studentIds.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button" 
                          onClick={() => setFormData({ ...formData, studentIds: [] })}
                          className="text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <span>⛔</span>
                          إلغاء تحديد الكل
                        </Button>
                      )}
                    </div>
                    
                    {selectedStudents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 p-2 border rounded-md bg-muted/30">
                        {selectedStudents.map(student => (
                          <Badge 
                            key={student.id} 
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleStudentSelection(student.id)}
                          >
                            {student.full_name}
                            <span className="ml-1 text-xs">×</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="بحث عن طالب بالاسم أو الرمز"
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="mb-2 pl-10 pr-4"
                      />
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                    </div>

                    <ScrollArea className="border rounded-md h-[180px] p-2">
                      {filteredStudents.length > 0 ? (
                        <div className="space-y-1">
                          {filteredStudents.map((student) => (
                            <div 
                              key={student.id} 
                              className={`flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer ${formData.studentIds.includes(student.id) ? 'bg-accent/30 border border-primary/20' : ''}`}
                              onClick={() => handleStudentSelection(student.id)}
                            >
                              <div className="flex items-center gap-2">
                                {formData.studentIds.includes(student.id) ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                                <span>
                                  {student.full_name} <span className="text-xs text-muted-foreground">({student.user_code})</span>
                                </span>
                              </div>
                              <Badge variant={student.is_test ? "outline" : "secondary"} className="text-xs">
                                {student.is_test ? "تجريبي" : "طالب"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Users className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm text-center">
                            {studentSearchTerm ? "لا توجد نتائج للبحث" : "لا يوجد طلاب"}
                          </p>
                          </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isEditMode ? "حفظ التعديلات" : "حفظ الصف"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
      </div>
  )
}
