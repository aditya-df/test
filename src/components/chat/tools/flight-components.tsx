"use client";

import { memo, useCallback, useState, useMemo } from "react";
import { formatDate, parseISO } from "date-fns";
import { 
  Check, 
  Plane, 
  Users, 
  CreditCard, 
  ArrowLeft, 
  Loader2,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  AlertCircle,
  Info,
  ChevronRight,
  Star,
  Wifi,
  Coffee,
  Monitor
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Types for better type safety
interface Flight {
  id: string;
  airline: {
    name: string;
    code: string;
    logo?: string;
  };
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  origin: string;
  destination: string;
  duration: number;
  price: {
    amount: number;
    currency: string;
  };
  stops?: number;
  aircraft?: string;
  amenities?: string[];
  rating?: number;
}

interface FlightSearchData {
  flights: Flight[];
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  cabin_class: string;
}

interface PassengerDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface BookingConfirmation {
  success: boolean;
  type: string;
  booking_id: string;
  flight_id: string;
  status: string;
  passengers: PassengerDetails[];
  payment_status: string;
  confirmation_email: string;
  booking_date: string;
}

// FIXED: Mobile-responsive progress indicator component
const BookingProgress = memo(({ currentStep }: { currentStep: string }) => {
  const steps = [
    { key: "select", label: "Select Flight", icon: Plane },
    { key: "details", label: "Passenger Info", icon: User },
    { key: "payment", label: "Payment", icon: CreditCard },
    { key: "confirmation", label: "Confirmation", icon: Check },
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="mb-4 sm:mb-6">
      {/* Mobile: Vertical layout, Desktop: Horizontal layout */}
      <div className="block sm:hidden">
        {/* Mobile Progress - Vertical Stack */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 flex-shrink-0
                  ${isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                  }
                  ${isCurrent ? 'ring-2 ring-blue-200' : ''}
                `}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400">Step {index + 1}</p>
                </div>
                {isCurrent && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Progress - Horizontal Layout */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step.key} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                  }
                  ${isCurrent ? 'ring-4 ring-blue-200' : ''}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    h-0.5 w-12 lg:w-20 mx-2 transition-all duration-300
                    ${index < currentIndex ? 'bg-blue-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Progress bar for both mobile and desktop */}
      <Progress value={progress} className="h-2 mt-3" />
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
        Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]?.label}
      </div>
    </div>
  );
});

BookingProgress.displayName = "BookingProgress";

// Flight amenities component
const FlightAmenities = memo(({ amenities = [] }: { amenities?: string[] }) => {
  const amenityIcons: { [key: string]: any } = {
    wifi: Wifi,
    entertainment: Monitor,
    meals: Coffee,
  };

  if (amenities.length === 0) return null;

  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
      {amenities.map((amenity) => {
        const Icon = amenityIcons[amenity.toLowerCase()] || Info;
        return (
          <TooltipProvider key={amenity}>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{amenity}</span>
                  <span className="sm:hidden">{amenity.slice(0, 4)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Available on this flight</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
});

FlightAmenities.displayName = "FlightAmenities";

// Enhanced FlightSearchResults component
export const FlightSearchResults = memo(({ data }: { data: FlightSearchData }) => {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<
    "select" | "details" | "payment" | "confirmation"
  >("select");
  const [passengerDetails, setPassengerDetails] = useState<PassengerDetails>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "paypal">("credit_card");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmation | null>(null);
  const [errors, setErrors] = useState<Partial<PassengerDetails>>({});
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);

  // Memoize expensive operations
  const formatTime = useCallback((isoString: string) => {
    try {
      return formatDate(parseISO(isoString), "h:mm a");
    } catch {
      return isoString;
    }
  }, []);

  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  const formatPrice = useCallback(
    (price: { amount: number; currency: string }) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: price.currency,
      }).format(price.amount);
    },
    []
  );

  const selectedFlight = useMemo(() => 
    data.flights.find((f: Flight) => f.id === selectedFlightId)
  , [data.flights, selectedFlightId]);

  // Enhanced validation with better error messages
  const validateForm = useCallback(() => {
    const newErrors: Partial<PassengerDetails> = {};
    
    if (!passengerDetails.first_name.trim()) {
      newErrors.first_name = "Please enter your first name";
    } else if (passengerDetails.first_name.trim().length < 2) {
      newErrors.first_name = "First name must be at least 2 characters";
    }
    
    if (!passengerDetails.last_name.trim()) {
      newErrors.last_name = "Please enter your last name";
    } else if (passengerDetails.last_name.trim().length < 2) {
      newErrors.last_name = "Last name must be at least 2 characters";
    }
    
    if (!passengerDetails.email.trim()) {
      newErrors.email = "Please enter your email address";
    } else if (!/\S+@\S+\.\S+/.test(passengerDetails.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!passengerDetails.phone.trim()) {
      newErrors.phone = "Please enter your phone number";
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(passengerDetails.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passengerDetails]);

  const handleFlightSelect = useCallback((flightId: string) => {
    setSelectedFlightId(flightId);
    setBookingStep("details");
    setExpandedFlight(null);
  }, []);

  const handleFlightExpand = useCallback((flightId: string) => {
    setExpandedFlight(expandedFlight === flightId ? null : flightId);
  }, [expandedFlight]);

  const handlePassengerDetailsChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPassengerDetails(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name as keyof PassengerDetails]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [errors]);

  const handlePaymentMethodChange = useCallback((value: "credit_card" | "paypal") => {
    setPaymentMethod(value);
  }, []);

  const handleContinueToPayment = useCallback(() => {
    if (validateForm()) {
      setBookingStep("payment");
    }
  }, [validateForm]);

  const handleBookFlight = useCallback(async () => {
    if (!selectedFlightId || !selectedFlight) return;

    setIsLoading(true);

    try {
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const confirmation: BookingConfirmation = {
        success: true,
        type: "flight_booking_confirmation",
        booking_id: `BK-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        flight_id: selectedFlightId,
        status: "confirmed",
        passengers: [passengerDetails],
        payment_status: "completed",
        confirmation_email: passengerDetails.email,
        booking_date: new Date().toISOString(),
      };

      setBookingConfirmation(confirmation);
      setBookingStep("confirmation");
    } catch (error) {
      console.error("Booking error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFlightId, selectedFlight, passengerDetails]);

  const handleBackToSelect = useCallback(() => {
    setBookingStep("select");
    setSelectedFlightId(null);
    setPassengerDetails({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
    });
    setErrors({});
  }, []);

  const handleBackToDetails = useCallback(() => {
    setBookingStep("details");
  }, []);

  if (!data || !data.flights || data.flights.length === 0) {
    return (
      <Card className="w-full my-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Plane className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
          </div>
          <CardTitle className="text-lg sm:text-xl">No Flights Found</CardTitle>
          <CardDescription className="text-center max-w-md mx-auto text-sm sm:text-base">
            We couldn&apos;t find any flights for your search criteria. Try adjusting your dates or destinations for more options.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try New Search
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Render booking confirmation
  if (bookingStep === "confirmation" && bookingConfirmation) {
    return <FlightBookingConfirmation bookingResult={bookingConfirmation} />;
  }

  return (
    <Card className="w-full my-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          {bookingStep !== "select" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={bookingStep === "details" ? handleBackToSelect : handleBackToDetails}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
        </div>
        
        <BookingProgress currentStep={bookingStep} />
        
        {bookingStep === "select" && (
          <>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Plane className="h-5 w-5 text-blue-500" />
              Choose Your Flight
            </CardTitle>
            {/* FIXED: Moved flight info outside CardDescription to avoid HTML nesting issues */}
            <div className="flex flex-col gap-2 sm:gap-4 text-sm sm:text-base">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{data.origin} → {data.destination}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(new Date(data.date), "MMM d, yyyy")}
                </span>
                {data.passengers > 1 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {data.passengers} passengers
                  </span>
                )}
                <Badge variant="outline" className="text-xs">
                  {data.cabin_class.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* Flight Selection Step */}
        {bookingStep === "select" && (
          <div className="space-y-4">
            {data.flights.map((flight: Flight) => (
              <Card 
                key={flight.id}
                className={`transition-all duration-200 hover:shadow-md cursor-pointer border-2 ${
                  selectedFlightId === flight.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                        {flight.airline.code}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-base sm:text-lg truncate">{flight.airline.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {flight.flight_number}
                          </p>
                          {flight.aircraft && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded hidden sm:inline">
                              {flight.aircraft}
                            </span>
                          )}
                        </div>
                        {flight.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-600">{flight.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto flex justify-between sm:block">
                      <div>
                        <p className="font-bold text-xl sm:text-2xl text-green-600">
                          {formatPrice(flight.price)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          per person
                        </p>
                      </div>
                    </div>
                  </div>
                  
                                    {/* Flight route details */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center mb-4">
                    <div className="text-center">
                      <p className="font-bold text-lg sm:text-xl">{formatTime(flight.departure_time)}</p>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{flight.origin}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <div className="border-t border-gray-300 flex-1"></div>
                        <div className="mx-2 sm:mx-3 bg-blue-100 dark:bg-blue-900 p-1 sm:p-2 rounded-full">
                          <Plane className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="border-t border-gray-300 flex-1"></div>
                      </div>
                      <p className="text-xs font-medium">
                        {formatDuration(flight.duration)}
                      </p>
                      {flight.stops !== undefined && (
                        <p className="text-xs text-gray-400">
                          {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <p className="font-bold text-lg sm:text-xl">{formatTime(flight.arrival_time)}</p>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{flight.destination}</p>
                    </div>
                  </div>

                  {/* Amenities */}
                  <FlightAmenities amenities={flight.amenities} />

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button 
                      onClick={() => handleFlightSelect(flight.id)}
                      className="flex-1 text-sm sm:text-base"
                      size="lg"
                    >
                      Select Flight
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleFlightExpand(flight.id)}
                      size="lg"
                      className="w-full sm:w-auto text-sm sm:text-base"
                    >
                      {expandedFlight === flight.id ? "Less Info" : "More Info"}
                    </Button>
                  </div>

                  {/* Expanded details */}
                  {expandedFlight === flight.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Flight Details</h4>
                          <div className="space-y-1 text-gray-600 dark:text-gray-400">
                            <p>Departure: {formatTime(flight.departure_time)} from {flight.origin}</p>
                            <p>Arrival: {formatTime(flight.arrival_time)} at {flight.destination}</p>
                            <p>Duration: {formatDuration(flight.duration)}</p>
                            {flight.aircraft && <p>Aircraft: {flight.aircraft}</p>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Booking Information</h4>
                          <div className="space-y-1 text-gray-600 dark:text-gray-400">
                            <p>Cabin Class: {data.cabin_class.replace("_", " ")}</p>
                            <p>Passengers: {data.passengers}</p>
                            <p>Total Price: {formatPrice({
                              amount: flight.price.amount * data.passengers,
                              currency: flight.price.currency
                            })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Passenger Details Step */}
        {bookingStep === "details" && selectedFlight && (
          <div className="space-y-4 sm:space-y-6">
            {/* Selected Flight Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                Selected Flight
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-base sm:text-lg">{selectedFlight.airline.name} {selectedFlight.flight_number}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                    {formatTime(selectedFlight.departure_time)} - {formatTime(selectedFlight.arrival_time)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedFlight.origin} → {selectedFlight.destination}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-bold text-xl sm:text-2xl text-green-600">{formatPrice(selectedFlight.price)}</p>
                  <p className="text-sm text-gray-500">per person</p>
                </div>
              </div>
            </div>

            {/* Helper alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Please ensure the passenger name matches exactly with your government-issued ID for domestic flights or passport for international flights.
              </AlertDescription>
            </Alert>

            {/* Passenger Details Form */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <h3 className="font-semibold text-base sm:text-lg">Passenger Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="flex items-center gap-2 text-sm sm:text-base">
                    <User className="h-4 w-4" />
                    First Name *
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={passengerDetails.first_name}
                    onChange={handlePassengerDetailsChange}
                    className={`transition-all duration-200 text-sm sm:text-base ${errors.first_name ? "border-red-500 focus:ring-red-200" : "focus:ring-blue-200"}`}
                    placeholder="Enter your first name"
                  />
                  {errors.first_name && (
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {errors.first_name}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="flex items-center gap-2 text-sm sm:text-base">
                    <User className="h-4 w-4" />
                    Last Name *
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={passengerDetails.last_name}
                    onChange={handlePassengerDetailsChange}
                    className={`transition-all duration-200 text-sm sm:text-base ${errors.last_name ? "border-red-500 focus:ring-red-200" : "focus:ring-blue-200"}`}
                    placeholder="Enter your last name"
                  />
                  {errors.last_name && (
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {errors.last_name}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm sm:text-base">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={passengerDetails.email}
                  onChange={handlePassengerDetailsChange}
                  className={`transition-all duration-200 text-sm sm:text-base ${errors.email ? "border-red-500 focus:ring-red-200" : "focus:ring-blue-200"}`}
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-gray-500">We&apos;ll send your boarding pass and updates to this email</p>
                {errors.email && (
                  <div className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm sm:text-base">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={passengerDetails.phone}
                  onChange={handlePassengerDetailsChange}
                  className={`transition-all duration-200 text-sm sm:text-base ${errors.phone ? "border-red-500 focus:ring-red-200" : "focus:ring-blue-200"}`}
                  placeholder="+1 (555) 123-4567"
                />
                <p className="text-xs text-gray-500">For flight updates and emergency contact</p>
                {errors.phone && (
                  <div className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Step */}
        {bookingStep === "payment" && selectedFlight && (
          <div className="space-y-4 sm:space-y-6">
            {/* Booking Summary */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Booking Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Flight:</span>
                  <span className="font-medium text-right">{selectedFlight.airline.name} {selectedFlight.flight_number}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Route:</span>
                  <span className="font-medium text-right">{selectedFlight.origin} → {selectedFlight.destination}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="font-medium">{formatDate(new Date(data.date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Passenger:</span>
                  <span className="font-medium text-right">{passengerDetails.first_name} {passengerDetails.last_name}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Class:</span>
                  <Badge variant="outline" className="text-xs">
                    {data.cabin_class.replace("_", " ")}
                  </Badge>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between items-center py-2 text-base sm:text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span className="text-green-600 text-xl sm:text-2xl">{formatPrice(selectedFlight.price)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Payment Method
              </h4>
              <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange} className="space-y-3">
                <div className="flex items-center space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label htmlFor="credit_card" className="flex items-center gap-2 cursor-pointer flex-1 text-sm sm:text-base">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Credit Card</p>
                      <p className="text-xs sm:text-sm text-gray-500">Secure payment with Visa, Mastercard, or Amex</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer flex-1 text-sm sm:text-base">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">P</div>
                    <div>
                      <p className="font-medium">PayPal</p>
                      <p className="text-xs sm:text-sm text-gray-500">Pay securely with your PayPal account</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Security notice */}
            <Alert>
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-sm">
                Your payment is secured with industry-standard encryption. We never store your payment details.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>

      {/* Action Buttons */}
      {bookingStep === "details" && (
        <CardFooter className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
          <Button 
            onClick={handleContinueToPayment} 
            className="w-full text-sm sm:text-base"
            size="lg"
          >
            Continue to Payment
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      )}

      {bookingStep === "payment" && (
        <CardFooter className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
          <Button 
            onClick={handleBookFlight} 
            disabled={isLoading}
            className="w-full text-sm sm:text-base"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing Your Booking...
              </>
            ) : (
              <>
                Confirm Booking
                <Check className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});

FlightSearchResults.displayName = "FlightSearchResults";

// Enhanced Flight Booking Confirmation Component
export const FlightBookingConfirmation = memo(({ bookingResult }: { bookingResult: BookingConfirmation }) => {
  return (
    <Card className="w-full my-4 border-green-200 dark:border-green-800 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-center p-4 sm:p-6">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-green-700 dark:text-green-400 text-xl sm:text-2xl">
          🎉 Booking Confirmed!
        </CardTitle>
        <div className="text-base sm:text-lg mt-2">
          Your flight has been successfully booked! 🛫
          <br />
          Confirmation details have been sent to{" "}
          <span className="font-medium text-green-700 dark:text-green-300 break-all">{bookingResult.confirmation_email}</span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Booking Reference Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="text-center md:text-left">
                <h3 className="font-semibold text-xs sm:text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Booking Reference
                </h3>
                <p className="text-2xl sm:text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider break-all">
                  {bookingResult.booking_id}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Save this reference number</p>
              </div>
              <div className="text-center md:text-right">
                <h3 className="font-semibold text-xs sm:text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Status
                </h3>
                <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 sm:px-4 py-2 rounded-full">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-bold uppercase text-xs sm:text-sm">{bookingResult.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base">Passenger</h4>
              <p className="font-medium text-base sm:text-lg break-words">
                {bookingResult.passengers[0]?.first_name} {bookingResult.passengers[0]?.last_name}
              </p>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base">Payment Status</h4>
              <div className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <p className="font-medium capitalize text-green-600 dark:text-green-400 text-sm sm:text-base">
                  {bookingResult.payment_status}
                </p>
              </div>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base">Booking Date</h4>
              <p className="font-medium text-sm sm:text-base">
                {formatDate(new Date(bookingResult.booking_date), "MMM d, yyyy")}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                {formatDate(new Date(bookingResult.booking_date), "h:mm a")}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              What&apos;s Next?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Check your email</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      We&apos;ve sent your e-ticket and booking details
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Online check-in</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Available 24 hours before departure
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Arrive at airport</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      2 hours early for domestic, 3 hours for international
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Bring valid ID</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Government-issued photo ID required
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              <strong>Important:</strong> Please arrive at the airport with sufficient time for security screening. 
              Check-in counters typically close 45-60 minutes before domestic flights and 90 minutes before international flights.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row gap-3 p-4 sm:p-6">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Need help? Contact our 24/7 support team
          </p>
          <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 break-words">
            📞 1-800-FLY-HELP or ✉️ support@airline.com
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Email Receipt
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send booking details to another email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Add to Calendar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add flight to your calendar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
});

FlightBookingConfirmation.displayName = "FlightBookingConfirmation";

