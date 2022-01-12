
import { Address } from "@kvalitetsit/hjemmebehandling/Models/Address";
import { Answer, NumberAnswer, StringAnswer,BooleanAnswer } from "@kvalitetsit/hjemmebehandling/Models/Answer";
import { CategoryEnum } from "@kvalitetsit/hjemmebehandling/Models/CategoryEnum";
import { Contact } from "@kvalitetsit/hjemmebehandling/Models/Contact";
import DetailedOrganization, { PhoneHour } from "@kvalitetsit/hjemmebehandling/Models/DetailedOrganization";
import { DayEnum, Frequency, FrequencyEnum } from "@kvalitetsit/hjemmebehandling/Models/Frequency";
import { PatientCareplan } from "@kvalitetsit/hjemmebehandling/Models/PatientCareplan";
import { PatientDetail } from "@kvalitetsit/hjemmebehandling/Models/PatientDetail";
import { PlanDefinition } from "@kvalitetsit/hjemmebehandling/Models/PlanDefinition";
import { Question, QuestionTypeEnum } from "@kvalitetsit/hjemmebehandling/Models/Question";
import { Questionnaire } from "@kvalitetsit/hjemmebehandling/Models/Questionnaire";
import { QuestionnaireResponse, QuestionnaireResponseStatus } from "@kvalitetsit/hjemmebehandling/Models/QuestionnaireResponse";
import SimpleDepartment from "@kvalitetsit/hjemmebehandling/Models/SimpleOrganization";
import { Task } from "@kvalitetsit/hjemmebehandling/Models/Task";
import { ThresholdCollection } from "@kvalitetsit/hjemmebehandling/Models/ThresholdCollection";
import { User } from "@kvalitetsit/hjemmebehandling/Models/User";
import { AnswerDto, AnswerDtoAnswerTypeEnum, CarePlanDto, ContactDetailsDto, FrequencyDto, FrequencyDtoWeekdaysEnum, OrganizationDto, PatientDto, PhoneHourDto, PhoneHourDtoWeekdaysEnum, PlanDefinitionDto, QuestionDto, QuestionDtoQuestionTypeEnum, QuestionnaireResponseDto, QuestionnaireResponseDtoExaminationStatusEnum, QuestionnaireResponseDtoTriagingCategoryEnum, QuestionnaireWrapperDto, ThresholdDto, ThresholdDtoTypeEnum, UserContext } from "../../generated/models";
import FhirUtils from "../../util/FhirUtils";
import BaseMapper from "./BaseMapper";
import PersonContact from "@kvalitetsit/hjemmebehandling/Models/PersonContact";


/**
 * This class maps from the external models (used in bff-api) to the internal models (used in frontend)
 */
export default class ExternalToInternalMapper extends BaseMapper {
    mapOrganization(response: OrganizationDto): DetailedOrganization {
        let organization = new DetailedOrganization()

        organization.id = response.id
        organization.name = response.name

        let address = new Address()
        address.street = response.street
        address.zipCode = response.postalCode
        address.city = response.city
        address.country = response.country
        organization.address = address

        organization.phoneNumber = response.phone

        organization.phoneHours = response?.phoneHours?.map(ph => this.mapPhoneHourDto(ph)) ?? [] //response.phoneHours.map(ph)

        return organization
    }

    mapPhoneHourDto(phoneHourDto: PhoneHourDto): PhoneHour {
        let phoneHour = new PhoneHour()

        phoneHour.days = phoneHourDto?.weekdays?.map(d => this.mapPhoneHourDtoWeekdaysEnum(d)) ?? []
        phoneHour.timePeriods = [{ fromTime: phoneHourDto.from, toTime: phoneHourDto.to }]

        return phoneHour
    }

    mapCarePlanDto(carePlanDto: CarePlanDto): PatientCareplan {

        let carePlan = new PatientCareplan();

        carePlan.id = FhirUtils.unqualifyId(carePlanDto.id);
        carePlan.planDefinitions = carePlanDto.planDefinitions!.map(pd => this.mapPlanDefinitionDto(pd))
        carePlan.questionnaires = carePlanDto?.questionnaires?.map(q => this.mapQuestionnaireDto(q)) ?? []
        carePlan.patient = this.mapPatientDto(carePlanDto.patientDto!);
        if (!carePlanDto.created) {
            throw new Error('No creation date on careplan!')
        }
        carePlan.creationDate = carePlanDto.created
        carePlan.terminationDate = carePlanDto.endDate

        let department = new SimpleDepartment()
        department.id = carePlanDto.organizationId!
        department.name = carePlanDto.departmentName
        carePlan.organization = department

        return carePlan
    }

    buildTaskFromCarePlan(carePlan: CarePlanDto): Task {
        let task = new Task()

        task.cpr = carePlan.patientDto!.cpr!
        task.category = CategoryEnum.BLUE
        task.firstname = carePlan.patientDto!.givenName
        task.lastname = carePlan.patientDto!.familyName
        task.questionnaireResponseStatus = undefined
        task.carePlanId = carePlan.id

        var questionnaire = carePlan.questionnaires![0].questionnaire!
        task.questionnaireId = questionnaire.id!
        task.questionnaireName = questionnaire.title!

        task.answeredTime = undefined
        task.responseLinkEnabled = false

        return task
    }

    buildTaskFromQuestionnaireResponse(questionnaireResponse: QuestionnaireResponseDto): Task {
        let task = new Task()

        task.cpr = questionnaireResponse.patient!.cpr!
        task.category = this.mapTriagingCategory(questionnaireResponse.triagingCategory!)
        task.firstname = questionnaireResponse.patient!.givenName
        task.lastname = questionnaireResponse.patient!.familyName
        task.questionnaireResponseStatus = this.mapExaminationStatus(questionnaireResponse.examinationStatus!)
        task.questionnaireId = questionnaireResponse.questionnaireId!
        task.questionnaireName = questionnaireResponse.questionnaireName!
        task.answeredTime = questionnaireResponse.answered!
        task.responseLinkEnabled = true

        return task
    }

    mapPlanDefinitionDto(planDefinitionDto: PlanDefinitionDto): PlanDefinition {

        let planDefinition = new PlanDefinition()

        planDefinition.id = planDefinitionDto.id!
        planDefinition.name = planDefinitionDto.title ?? "Titel mangler";
        planDefinition.questionnaires = planDefinitionDto.questionnaires?.map(q => this.mapQuestionnaireDto(q)) ?? []

        return planDefinition

    }

    mapThresholdDtos(thresholdDtos: Array<ThresholdDto>): Array<ThresholdCollection> {

        console.log(thresholdDtos)
        let thresholds: ThresholdCollection[] = [];


        for (var thresholdDto of thresholdDtos) {
            let threshold = thresholds.find(x => x.questionId == thresholdDto.questionId);
            if (threshold === undefined) {
                threshold = new ThresholdCollection();
                threshold.questionId = thresholdDto.questionId!;
                thresholds.push(threshold);
            }

            if (!(thresholdDto.valueBoolean === undefined)) {
                console.log(threshold.questionId + "=thresholdOption")
                let thresholdOption = this.CreateOption(
                    thresholdDto.questionId!,
                    String(thresholdDto.valueBoolean!),
                    this.mapTresholdCategory(thresholdDto.type!)
                );
                threshold.thresholdOptions!.push(thresholdOption);
            }
            else {
                console.log(threshold.questionId + "=thresholdNumber")
                let thresholdNumber = this.CreateThresholdNumber(
                    thresholdDto.questionId!,
                    Number(thresholdDto.valueQuantityLow),
                    Number(thresholdDto.valueQuantityHigh),
                    this.mapTresholdCategory(thresholdDto.type!)
                );
                threshold.thresholdNumbers!.push(thresholdNumber);
            }
        }
        console.log(thresholds)
        return thresholds;

    }
    mapWeekdayDto(weekdays: FrequencyDtoWeekdaysEnum[]): DayEnum[] {
        let dayEnums: DayEnum[] = [];
        for (var weekday of weekdays) {
            dayEnums.push(this.mapFrequencyDtoWeekdaysEnum(weekday));
        }
        return dayEnums;
    }


    mapQuestionDto(questionDto: QuestionDto): Question {
        let question = new Question()

        question.Id = questionDto.linkId!
        question.type = this.mapQuestionType(questionDto.questionType!)
        question.question = questionDto.text!

        if (questionDto.questionType === QuestionDtoQuestionTypeEnum.Boolean) {
            question.options = ["Ja", "Nej"]
        }
        if (questionDto.questionType === QuestionDtoQuestionTypeEnum.Choice) {
            question.options = questionDto.options
        }

        return question;
    }

    mapQuestionType(type: QuestionDtoQuestionTypeEnum): QuestionTypeEnum {
        switch (type) {
            case QuestionDtoQuestionTypeEnum.Boolean:
            case QuestionDtoQuestionTypeEnum.Choice:
                return QuestionTypeEnum.CHOICE
            case QuestionDtoQuestionTypeEnum.Integer:
                return QuestionTypeEnum.INTEGER
            case QuestionDtoQuestionTypeEnum.Quantity:
                return QuestionTypeEnum.OBSERVATION
            case QuestionDtoQuestionTypeEnum.String:
                return QuestionTypeEnum.STRING
            default:
                throw new Error('Could not map question type ' + type);
        }
    }

    mapTriagingCategory(category: QuestionnaireResponseDtoTriagingCategoryEnum): CategoryEnum {
        switch (category) {
            case QuestionnaireResponseDtoTriagingCategoryEnum.Green:
                return CategoryEnum.GREEN
            case QuestionnaireResponseDtoTriagingCategoryEnum.Yellow:
                return CategoryEnum.YELLOW
            case QuestionnaireResponseDtoTriagingCategoryEnum.Red:
                return CategoryEnum.RED
            default:
                throw new Error('Could not map category ' + category);
        }
    }

    mapTresholdCategory(category: ThresholdDtoTypeEnum): CategoryEnum {
        switch (category) {
            case ThresholdDtoTypeEnum.Normal:
                return CategoryEnum.GREEN
            case ThresholdDtoTypeEnum.Abnormal:
                return CategoryEnum.YELLOW
            case ThresholdDtoTypeEnum.Critical:
                return CategoryEnum.RED
            default:
                throw new Error('Could not map category ' + category);
        }
    }

    mapFrequencyDtoWeekdaysEnum(weekday: FrequencyDtoWeekdaysEnum): DayEnum {
        switch (weekday) {
            case FrequencyDtoWeekdaysEnum.Mon:
                return DayEnum.Monday;
            case FrequencyDtoWeekdaysEnum.Tue:
                return DayEnum.Tuesday;
            case FrequencyDtoWeekdaysEnum.Wed:
                return DayEnum.Wednesday;
            case FrequencyDtoWeekdaysEnum.Thu:
                return DayEnum.Thursday;
            case FrequencyDtoWeekdaysEnum.Fri:
                return DayEnum.Friday;
            case FrequencyDtoWeekdaysEnum.Sat:
                return DayEnum.Saturday;
            case FrequencyDtoWeekdaysEnum.Sun:
                return DayEnum.Sunday;

            default:
                throw new Error('Could not map weekday ' + weekday);
        }
    }

    mapPhoneHourDtoWeekdaysEnum(weekday: PhoneHourDtoWeekdaysEnum): DayEnum {
        switch (weekday) {
            case PhoneHourDtoWeekdaysEnum.Mon:
                return DayEnum.Monday;
            case PhoneHourDtoWeekdaysEnum.Tue:
                return DayEnum.Tuesday;
            case PhoneHourDtoWeekdaysEnum.Wed:
                return DayEnum.Wednesday;
            case PhoneHourDtoWeekdaysEnum.Thu:
                return DayEnum.Thursday;
            case PhoneHourDtoWeekdaysEnum.Fri:
                return DayEnum.Friday;
            case PhoneHourDtoWeekdaysEnum.Sat:
                return DayEnum.Saturday;
            case PhoneHourDtoWeekdaysEnum.Sun:
                return DayEnum.Sunday;
            default:
                throw new Error('Could not map weekday ' + weekday);
        }
    }

    mapUserFromExternalToInternal(user: UserContext): User {
        const internalUser = new User();
        //internalUser.autorisationsids = user.autorisationsids;
        //internalUser.email = user.email;
        internalUser.entitlements = user.entitlements?.map(e => this.mapSingleEntitlement(e)).filter(e => e != undefined);
        internalUser.firstName = user.firstName;
        internalUser.fullName = user.fullName;
        internalUser.lastName = user.lastName;
        //internalUser.orgId = user.orgId;
        //internalUser.orgName = user.orgName;
        internalUser.userId = user.userId!;

        return internalUser;
    }

    mapSingleEntitlement(entitlement: string): string {
        const splittedByUnderscore = entitlement.split("_");
        const lenght = splittedByUnderscore.length
        const mappedEntitlement = splittedByUnderscore[lenght-1]
        return mappedEntitlement;
    }

    mapExaminationStatus(status: QuestionnaireResponseDtoExaminationStatusEnum): QuestionnaireResponseStatus {
        switch (status) {
            case QuestionnaireResponseDtoExaminationStatusEnum.NotExamined:
                return QuestionnaireResponseStatus.NotProcessed
            case QuestionnaireResponseDtoExaminationStatusEnum.UnderExamination:
                return QuestionnaireResponseStatus.InProgress
            case QuestionnaireResponseDtoExaminationStatusEnum.Examined:
                return QuestionnaireResponseStatus.Processed
            default:
                throw new Error('Could not map ExaminationStatus ' + status)
        }
    }

    mapPersonContactFromExternalToInternal(externalPersonContact: ContactDetailsDto | undefined): PersonContact {
        const internalPersonContact = new PersonContact();
        internalPersonContact.city = externalPersonContact?.city;
        internalPersonContact.country = externalPersonContact?.country;
        internalPersonContact.postalCode = externalPersonContact?.postalCode;
        internalPersonContact.primaryPhone = externalPersonContact?.primaryPhone;
        internalPersonContact.secondaryPhone = externalPersonContact?.secondaryPhone;
        internalPersonContact.street = externalPersonContact?.street;

        return internalPersonContact;
    }

    mapAnswerDto(answerDto: AnswerDto): Answer {
        
        switch (answerDto.answerType) {
            case AnswerDtoAnswerTypeEnum.Integer:
                return this.mapNumberedAnswer(answerDto);
            case AnswerDtoAnswerTypeEnum.Quantity:
                return this.mapNumberedAnswer(answerDto);
            case AnswerDtoAnswerTypeEnum.Boolean:
                return this.mapBooleanAnswer(answerDto);
            default:
                return this.mapStringAnswer(answerDto); //Treat as string as default
        }


    }

    mapStringAnswer(answerDto: AnswerDto): StringAnswer {
        let toReturn = new StringAnswer();
        toReturn.answer = answerDto.value!
        return toReturn;
    }

    mapNumberedAnswer(answerDto: AnswerDto): NumberAnswer {
        let toReturn = new NumberAnswer();
        toReturn.answer = Number.parseFloat(answerDto.value!)
        return toReturn;
    }

    mapBooleanAnswer(answerDto: AnswerDto): BooleanAnswer {
        let toReturn = new BooleanAnswer();
        let answerValue = answerDto.value?.toLowerCase()

        let isTrueOrFalse = answerValue == "true" || answerValue == "false"
        if (isTrueOrFalse) {
            toReturn.answer = answerValue == "true"
            return toReturn;
        }

        throw new Error("Answer in AnswerDto was not a boolean")
    }

    mapQuestionnaireResponseDto(questionnaireResponseDto: QuestionnaireResponseDto): QuestionnaireResponse {
        let response = new QuestionnaireResponse();
        //let response = this.getQuestionnaireResponse();
        response.id = FhirUtils.unqualifyId(questionnaireResponseDto.id!);
        response.questions = new Map<Question, Answer>();

        for (var pair of questionnaireResponseDto.questionAnswerPairs!) {
            var question = this.mapQuestionDto(pair.question!);
            var answer = this.mapAnswerDto(pair.answer!);
            response.questions.set(question, answer);
        }

        response.answeredTime = questionnaireResponseDto.answered;
        response.status = this.mapExaminationStatus(questionnaireResponseDto.examinationStatus!);
        response.examinedTime = questionnaireResponseDto.examined;
        if (questionnaireResponseDto.triagingCategory === QuestionnaireResponseDtoTriagingCategoryEnum.Red) {
            response.category = CategoryEnum.RED;
        } else if (questionnaireResponseDto.triagingCategory === QuestionnaireResponseDtoTriagingCategoryEnum.Yellow) {
            response.category = CategoryEnum.YELLOW;
        } else if (questionnaireResponseDto.triagingCategory === QuestionnaireResponseDtoTriagingCategoryEnum.Green) {
            response.category = CategoryEnum.GREEN;
        } else {
            response.category = CategoryEnum.BLUE;
        }
        response.patient = this.mapPatientDto(questionnaireResponseDto.patient!);
        response.questionnaireId = FhirUtils.unqualifyId(questionnaireResponseDto.questionnaireId!)

        return response;
    }
    mapFrequencyDto(frequencyDto: FrequencyDto): Frequency {

        let frequency = new Frequency();

        frequency.repeated = FrequencyEnum.WEEKLY
        frequency.days = this.mapWeekdayDto(frequencyDto.weekdays!)
        frequency.deadline = frequencyDto.timeOfDay!

        return frequency;

    }

    mapQuestionnaireDto(wrapper: QuestionnaireWrapperDto): Questionnaire {

        let questionnaire = new Questionnaire()

        questionnaire.id = FhirUtils.unqualifyId(wrapper.questionnaire!.id!)
        questionnaire.name = wrapper.questionnaire!.title!
        questionnaire.frequency = this.mapFrequencyDto(wrapper.frequency!)
        questionnaire.thresholds = this.mapThresholdDtos(wrapper.thresholds!)
        questionnaire.questions = wrapper.questionnaire!.questions!.map(q => this.mapQuestionDto(q))

        return questionnaire
    }

    mapContactDetailsDto(patientContactDetails: ContactDetailsDto): Contact {

        let contact = new Contact();

        let address = new Address();
        console.log('ContactDetails: ' + JSON.stringify(patientContactDetails));
        address.street = patientContactDetails?.street ?? 'Fiskergade 66';
        address.zipCode = patientContactDetails?.postalCode ?? '8000';
        address.city = "Aarhus";
        address.country = patientContactDetails?.country ?? 'Danmark';

        contact.primaryPhone = patientContactDetails?.primaryPhone ?? "12345678";
        contact.secondaryPhone = patientContactDetails?.secondaryPhone ?? "87654321";

        return contact;
    }

    mapPatientDto(patientDto: PatientDto): PatientDetail {

        let patient = new PatientDetail();

        patient.firstname = patientDto.givenName;
        patient.lastname = patientDto.familyName;
        patient.cpr = patientDto.cpr;
        patient.address = this.mapPatientContactDetails(patientDto.patientContactDetails)
        patient.contact = this.mapContactDetailsDto(patientDto.primaryRelativeContactDetails!)
        patient.primaryPhone = patientDto.primaryRelativeContactDetails?.primaryPhone;
        patient.secondaryPhone = patientDto.primaryRelativeContactDetails?.secondaryPhone;


        return patient;

    }
    mapPatientContactDetails(patientContactDetails: ContactDetailsDto | undefined): Address {
        const address = new Address();
        address.city = patientContactDetails?.city;
        address.country = patientContactDetails?.country;
        address.zipCode = patientContactDetails?.postalCode;
        address.street = patientContactDetails?.street;
        return address;
    }
}